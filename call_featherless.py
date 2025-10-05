import os
from huggingface_hub import InferenceClient

PROMPT = "Can you please let us know more details about your "
MODEL_ID = os.environ.get("ROAST_MODEL_ID", "meta-llama/Llama-3.1-8B")
PROVIDER = os.environ.get("HF_PROVIDER", "featherless-ai")
API_KEY = os.environ.get("HF_TOKEN")

if not API_KEY:
    raise RuntimeError("Environment variable HF_TOKEN tidak ditemukan.")

client = InferenceClient(provider=PROVIDER, api_key=API_KEY)

result = client.text_generation(
    PROMPT,
    model=MODEL_ID,
    max_new_tokens=200,
    temperature=0.8,
)

print(result)
