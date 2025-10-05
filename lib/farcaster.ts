const NEYNAR_BASE = process.env.NEYNAR_API_BASE ?? "https://api.neynar.com";

export type UserCast = {
  hash: string;
  text: string;
  timestamp: string;
  parentUrl?: string | null;
};

export async function fetchLatestCasts(username: string, limit = 10): Promise<UserCast[]> {
  if (!username) {
    throw new Error("Username is required");
  }

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEYNAR_API_KEY environment variable");
  }

  const normalizedUsername = username.toLowerCase();
  const searchResponse = await fetchJson<{
    result?: {
      users?: Array<{ fid?: number; username?: string }>;
    };
  }>(
    `${NEYNAR_BASE}/v2/farcaster/user/search?q=${encodeURIComponent(username)}&limit=5`,
    apiKey
  );

  const matchedUser = searchResponse.result?.users?.find(
    (candidate) => candidate.username?.toLowerCase() === normalizedUsername
  );
  const fid = matchedUser?.fid ?? searchResponse.result?.users?.[0]?.fid;
  if (!fid) {
    throw new Error(`Tidak menemukan pengguna @${username} di Farcaster`);
  }

  const safeLimit = Math.max(1, Math.min(Math.trunc(limit) || 1, 100));
  const feedResponse = await fetchJson<{
    casts?: Array<{
      hash: string;
      text: string;
      timestamp: string;
      parent_url?: string | null;
    }>;
  }>(
    `${NEYNAR_BASE}/v2/farcaster/feed?feed_type=user&fid=${fid}&limit=${safeLimit}`,
    apiKey
  );

  return (feedResponse.casts ?? []).map((cast) => ({
    hash: cast.hash,
    text: cast.text,
    timestamp: cast.timestamp,
    parentUrl: cast.parent_url
  }));
}

async function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      api_key: apiKey
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    const body = await safeReadJson(response);
    const message = body?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    console.error("Failed to parse Neynar error response", error);
    return undefined;
  }
}
