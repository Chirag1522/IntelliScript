# translator.py
from deep_translator import GoogleTranslator

def translate(text: str, dest: str = "en") -> str:
    try:
        # Add a character limit to avoid issues with long texts
        # Google Translate has a limit of around 5000 characters, so we'll be safe.
        if len(text) > 4500:
            text = text[:4500]
        return GoogleTranslator(target=dest).translate(text)
    except Exception as e:
        return f"Translation failed: {str(e)}"