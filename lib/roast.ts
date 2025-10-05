const MAX_NEW_TOKENS = 180;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

const DEFAULT_MODEL_ID = "meta-llama/Llama-3.1-8B-Instruct";
const DEFAULT_PROVIDER = "featherless-ai";
const MODEL_ID = (process.env.ROAST_MODEL_ID ?? DEFAULT_MODEL_ID).trim();
const PROVIDER = (process.env.HF_PROVIDER ?? DEFAULT_PROVIDER).trim();
const NORMALIZED_PROVIDER = PROVIDER.toLowerCase();
const PROVIDER_ENABLED = NORMALIZED_PROVIDER.length > 0 && NORMALIZED_PROVIDER !== "hf-inference";

const hfAccessToken = process.env.HUGGING_FACE_ACCESS_TOKEN;
if (!hfAccessToken) {
  throw new Error("HUGGING_FACE_ACCESS_TOKEN belum dikonfigurasi di server");
}

const isHuggingFaceToken = hfAccessToken.startsWith("hf_");
const shouldRouteThroughProvider = PROVIDER_ENABLED && isHuggingFaceToken;

const BASE_API_URL = (process.env.HUGGING_FACE_API_URL ?? buildDefaultApiUrl(MODEL_ID)).trim();
const HF_API_URL = !shouldRouteThroughProvider && PROVIDER_ENABLED
  ? appendQuery(BASE_API_URL, `provider=${encodeURIComponent(PROVIDER)}`)
  : BASE_API_URL;

const providerModelCache = new Map<string, string>();

type UserCast = import("./farcaster").UserCast;

type HuggingFaceSuccessResponse = Array<{ generated_text?: string; output_text?: string }>;
type HuggingFaceErrorResponse = {
  error?: string;
  estimated_time?: number;
};
type HuggingFaceResponsePayload = HuggingFaceSuccessResponse | HuggingFaceErrorResponse | string;

type ProviderMappingResponse = {
  inferenceProviderMapping?: Record<string, { providerId?: string; status?: string; task?: string }>;
};

const intensityDescriptors = [
  "Ringannya kayak roast sahabat lama. Tetap jahil dan kocak.",
  "Sedikit lebih panas. Sassy tapi masih terasa sayang.",
  "Bikin temen-temen sekitar bilang \"waduh\". Savage tapi nggak kejam.",
  "Full throttle. Pedas maksimal tapi tetap hindari hinaan terhadap identitas dilindungi.",
  "Galaxy brain burn. Brutal, hiperbola, namun masih berkelas dan lucu."
];

export type GenerateRoastParams = {
  username: string;
  casts: UserCast[];
  intensity: number;
};

export async function generateRoast({ username, casts, intensity }: GenerateRoastParams): Promise<string> {
  const descriptor = selectDescriptor(intensity);
  const prompt = buildPrompt({ username, casts, descriptor });
  const systemInstruction =
    "You are RoastMaster3000, seorang komedian yang ahli roasting yang tajam dan lucu. Kamu bikin orang ngakak sambil meringis. Jangan pernah bawa-bawa SARA, fisik, atau identitas dilindungi. Fokus pada konten, gaya hidup, dan vibe dari postingan user.";

  const formattedPrompt = formatPrompt(MODEL_ID, systemInstruction, prompt);
  const generated = await callHuggingFace(formattedPrompt);
  return sanitize(generated);
}

function selectDescriptor(intensity: number) {
  if (intensity <= 1) return intensityDescriptors[0];
  if (intensity >= intensityDescriptors.length) {
    return intensityDescriptors[intensityDescriptors.length - 1];
  }
  return intensityDescriptors[intensity - 1];
}

function buildPrompt({
  username,
  casts,
  descriptor
}: {
  username: string;
  casts: UserCast[];
  descriptor: string;
}) {
  if (!casts.length) {
    return `Pengguna @${username} belum punya cast terbaru. Bikin satu roast lucu yang menyinggung gaya misterius dia yang sepi timeline.`;
  }

  const formattedCasts = casts
    .map((cast, index) => {
      const snippet = cast.text.replace(/\s+/g, " ").trim();
      const timestamp = new Date(cast.timestamp).toISOString();
      return `${index + 1}. (${timestamp}) ${snippet}`;
    })
    .join("\n");

  return `Ini daftar cast terbaru dari @${username}:
${formattedCasts}

Tugasmu:
- Buat satu roast yang ${descriptor}
- Maksimal 3 kalimat.
- Jangan pakai format list, hashtag, atau mention orang lain.
- Sisipkan punchline baru, jangan ulang frasa sama.
- Tutupi roasting dengan humor yang tetep bisa diterima sahabat dekat.`;
}

async function callHuggingFace(prompt: string): Promise<string> {
  if (shouldRouteThroughProvider) {
    return callProviderRouter(prompt);
  }

  return callDefaultInferenceApi(prompt);
}

async function callProviderRouter(prompt: string): Promise<string> {
  const providerModelId = await resolveProviderModelId(MODEL_ID, NORMALIZED_PROVIDER);
  const url = buildProviderRouterUrl(NORMALIZED_PROVIDER);
  const payload = filterUndefined({
    prompt,
    model: providerModelId,
    max_tokens: MAX_NEW_TOKENS,
    temperature: 0.95,
    top_p: 0.9
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const rawBody = await response.text();
      const data = safeParseJson(rawBody);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const message = extractProviderError(data);
          throw new Error(
            message ??
              "Token Hugging Face kamu belum punya izin inference. Buat fine-grained token baru dengan scope Inference dan ulangi lagi."
          );
        }

        if (response.status === 404) {
          const message = extractProviderError(data);
          throw new Error(
            message ??
              `Provider ${PROVIDER} tidak mengenali model ${providerModelId}. Pastikan aksesmu ke ${MODEL_ID} sudah granted.`
          );
        }

        if (response.status === 429 || response.status === 503) {
          const retryAfterHeader = response.headers.get("retry-after");
          const retryMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : RETRY_BASE_DELAY_MS;
          await sleep(Math.min(10000, Math.max(retryMs, RETRY_BASE_DELAY_MS)));
          continue;
        }

        const message = extractProviderError(data) ?? `Permintaan ke provider ${PROVIDER} gagal (${response.status})`;
        throw new Error(message);
      }

      const text = extractProviderText(data);
      if (text) {
        return text;
      }

      throw new Error("Provider tidak mengembalikan teks roasting");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Gagal menghubungi provider");
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("Gagal menghubungi provider");
}

async function callDefaultInferenceApi(prompt: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: MAX_NEW_TOKENS,
            temperature: 0.95,
            top_p: 0.9,
            repetition_penalty: 1.1,
            do_sample: true,
            return_full_text: false
          },
          options: {
            wait_for_model: true
          }
        })
      });

      const rawBody = await response.text();
      const data = parseHuggingFaceBody(rawBody);

      if (!response.ok) {
        const providerMessage = getErrorMessage(data);

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            providerMessage ??
              "Token Hugging Face kamu belum punya izin inference. Buat fine-grained token baru dengan scope Inference dan ulangi lagi."
          );
        }

        if (response.status === 404) {
          const fallbackMessage = `Model ${MODEL_ID} tidak ditemukan oleh provider ${PROVIDER}. Pastikan tokenmu punya akses ke repositori di https://huggingface.co/${MODEL_ID} (tab Access → Accept) dan gunakan ID yang benar.`;
          throw new Error(
            providerMessage && providerMessage !== "Not Found"
              ? `${providerMessage}. ${fallbackMessage}`
              : fallbackMessage
          );
        }

        if (
          response.status === 503 &&
          data &&
          typeof data === "object" &&
          !Array.isArray(data)
        ) {
          const waitSeconds = typeof data.estimated_time === "number" ? data.estimated_time : 3;
          await sleep(Math.min(10000, Math.max(waitSeconds * 1000, RETRY_BASE_DELAY_MS)));
          continue;
        }

        const message =
          providerMessage ?? `Permintaan ke Hugging Face gagal (${response.status})`;
        throw new Error(message);
      }

      const text = extractGeneratedText(data);
      if (text) {
        return text;
      }

      throw new Error("Model tidak mengembalikan teks roasting");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Gagal menghubungi Hugging Face");
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("Gagal menghubungi Hugging Face");
}

function parseHuggingFaceBody(body: string): HuggingFaceResponsePayload {
  const trimmed = body.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return JSON.parse(trimmed) as HuggingFaceSuccessResponse | HuggingFaceErrorResponse;
  } catch (error) {
    return trimmed;
  }
}

function extractGeneratedText(data: HuggingFaceResponsePayload): string | null {
  if (typeof data === "string") {
    return data.trim() ? data.trim() : null;
  }

  if (!Array.isArray(data)) {
    return null;
  }

  const candidate = data[0];
  if (!candidate) {
    return null;
  }

  return typeof candidate.generated_text === "string"
    ? candidate.generated_text
    : typeof candidate.output_text === "string"
      ? candidate.output_text
      : null;
}

function getErrorMessage(data: HuggingFaceResponsePayload | null | undefined) {
  if (!data) {
    return null;
  }
  if (typeof data === "string") {
    return sanitize(data);
  }
  return typeof data.error === "string" ? sanitize(data.error) : null;
}

function extractProviderText(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const maybeChoices = (data as { choices?: Array<{ text?: string; message?: { content?: string } }> }).choices;
  if (!Array.isArray(maybeChoices) || maybeChoices.length === 0) {
    return null;
  }

  const firstChoice = maybeChoices[0];
  const text = firstChoice?.text ?? firstChoice?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

function extractProviderError(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return sanitize(data);
  }

  if (typeof data === "object") {
    const maybeError = (data as { error?: string; message?: string }).error ?? (data as { error?: string; message?: string }).message;
    if (typeof maybeError === "string" && maybeError.trim()) {
      return sanitize(maybeError);
    }
  }

  return null;
}

function safeParseJson(body: string): unknown {
  const trimmed = body.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return trimmed;
  }
}

async function resolveProviderModelId(modelId: string, provider: string): Promise<string> {
  const cacheKey = `${modelId}::${provider}`;
  const cached = providerModelCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const mapping = await fetchProviderMapping(modelId);
  const entry = mapping[provider];
  if (!entry?.providerId) {
    throw new Error(
      `Tidak menemukan mapping provider untuk ${modelId} di ${provider}. Cek https://huggingface.co/${modelId} → tab Access → Inference Providers.`
    );
  }

  providerModelCache.set(cacheKey, entry.providerId);
  return entry.providerId;
}

async function fetchProviderMapping(modelId: string) {
  const url = `https://huggingface.co/api/models/${encodeURIComponent(modelId)}?expand[]=inferenceProviderMapping`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${hfAccessToken}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gagal mengambil mapping provider (${response.status}): ${sanitize(message)}`);
  }

  const data = (await response.json()) as ProviderMappingResponse;
  return data.inferenceProviderMapping ?? {};
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPrompt(modelId: string, systemPrompt: string, userPrompt: string) {
  const trimmedSystem = systemPrompt.trim();
  const trimmedUser = userPrompt.trim();
  const lowerModel = modelId.toLowerCase();

  if (lowerModel.includes("llama-3")) {
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
${trimmedSystem}
<|eot_id|><|start_header_id|>user<|end_header_id|>
${trimmedUser}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;
  }

  if (lowerModel.includes("phi-3")) {
    return `<|system|>
${trimmedSystem}
<|user|>
${trimmedUser}
<|assistant|>
`;
  }

  return `${trimmedSystem}

User:
${trimmedUser}
Assistant:`;
}

function sanitize(text: string) {
  return text
    .replace(/```/g, "")
    .replace(/<\|.*?\|>/g, "")
    .replace(/<\/s>/g, "")
    .trim();
}

function buildDefaultApiUrl(modelId: string) {
  return `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
}

function buildProviderRouterUrl(provider: string) {
  return `https://router.huggingface.co/${provider}/v1/completions`;
}

function appendQuery(url: string, query: string) {
  if (!query) {
    return url;
  }

  return url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
}

function filterUndefined<T extends Record<string, unknown>>(object: T): T {
  const entries = Object.entries(object).filter(([, value]) => value !== undefined && value !== null);
  return Object.fromEntries(entries) as T;
}
