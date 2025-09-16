# main.py
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transcriber import fetch_captions
from Summarizer import get_summary   # make sure lowercase file name matches
from translator import translate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

# ---------------- Transcription ----------------
@app.post("/transcribe/")
async def transcribe_endpoint(url: str = Form(...)):
    transcript = fetch_captions(url)
    return {
        "transcript": transcript,
        "title": "Transcribed Video",
        "duration": 300
    }

# ---------------- Summarization ----------------
@app.post("/summarize/")
async def summarize_endpoint(
    text: str = Form(...),
    manual: str = Form(...),        # kept for compatibility with frontend
    model_choice: str = Form(...),  # kept for compatibility
):
    try:
        # ✅ Only use text (ignore model_choice/manual since HF API handles it)
        summary = get_summary(text)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

# ---------------- Translation ----------------
@app.post("/translate/")
async def translate_endpoint(
    text: str = Form(...),
    dest: str = Form(...),
):
    try:
        translated = translate(text, dest)
        if "Translation failed:" in translated:
            raise HTTPException(status_code=400, detail=translated)
        return {"translation": translated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
