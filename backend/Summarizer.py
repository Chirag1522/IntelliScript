import requests
import unicodedata
import os

# 🔑 Read Hugging Face token from environment variable
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

if not HF_API_KEY:
    raise RuntimeError("❌ Missing HUGGINGFACE_API_KEY environment variable")

# Hugging Face DistilBART model endpoint
API_URL = "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6"
HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}


def query(payload: dict):
    """Send request to Hugging Face Inference API."""
    response = requests.post(API_URL, headers=HEADERS, json=payload)
    if response.status_code != 200:
        raise Exception(f"HF API Error {response.status_code}: {response.text}")
    return response.json()


def get_summary(text: str) -> str:
    """Summarize text using Hugging Face API."""
    try:
        # Limit text length
        if len(text) > 3000:
            text = text[:3000]

        output = query({"inputs": text})

        # Handle HF "model is loading" or error messages
        if isinstance(output, dict) and "error" in output:
            return f"Hugging Face Error: {output['error']}"

        summary = output[0]["summary_text"]
        return clean_summary(summary)

    except Exception as e:
        print(f"🔥 Summarizer error: {e}")
        return f"Error: {str(e)}"


def clean_summary(text: str) -> str:
    """Clean irrelevant tokens and normalize output."""
    irrelevant = ["[music]", "[Music]", "<<", ">>", "\n"]
    for item in irrelevant:
        text = text.replace(item, "")
    cleaned = text.strip()
    normalized = unicodedata.normalize("NFKD", cleaned)
    return normalized.encode("ascii", "ignore").decode("ascii")
