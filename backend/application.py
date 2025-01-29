from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from google.generativeai import GenerativeModel
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Dict, List, Optional
from pydantic import BaseModel

# Load environment variables
load_dotenv()

app = FastAPI(title="PodcastAI Creator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google Gemini AI
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = GenerativeModel(
    model_name="gemini-1.5-pro",
    generation_config={
        "temperature": 0.5,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 5500,
    }
)

# Define response models
class Segment(BaseModel):
    speaker: str
    text: str

class PodcastResponse(BaseModel):
    success: bool
    script: str
    segments: List[Segment]

@app.post("/api/generate-from-transcript", response_model=PodcastResponse)
async def generate_from_transcript(transcript: str = Form(...)) -> Dict:
    try:
        if not transcript:
            raise HTTPException(status_code=400, detail="No transcript provided")

        # Truncate transcript if too long (free tier has lower limits)
        max_length = 2500  # Reduced from 5000
        truncated_transcript = transcript[:max_length]

        # Minimal prompt
        prompt = f"""Convert to podcast dialogue. Keep it brief:
Host A: [start conversation about this topic]
Host B: [respond naturally]
Topic: {truncated_transcript}"""
        
        try:
            response = model.generate_content(prompt)
            script = response.text if response.text else "Failed to generate content"
        except Exception as api_error:
            if "429" in str(api_error):
                raise HTTPException(
                    status_code=429, 
                    detail="Please try with a shorter transcript or wait a few minutes"
                )
            raise

        return {
            "success": True,
            "script": script,
            "segments": parse_script_to_segments(script)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-podcast", response_model=PodcastResponse)
async def generate_podcast(audio: UploadFile) -> Dict:
    try:
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No audio file provided")

        if not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Here you would process the audio file
        # For now, we'll return a placeholder response
        return {
            "success": True,
            "script": "Generated script from audio",
            "segments": []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def parse_script_to_segments(script: str) -> List[Segment]:
    segments = []
    current_speaker = None
    current_text = []
    
    for line in script.split('\n'):
        if ':' in line:
            if current_speaker and current_text:
                segments.append(Segment(
                    speaker=current_speaker,
                    text=' '.join(current_text)
                ))
            speaker, text = line.split(':', 1)
            current_speaker = speaker.strip()
            current_text = [text.strip()]
        elif line.strip() and current_speaker:
            current_text.append(line.strip())
    
    if current_speaker and current_text:
        segments.append(Segment(
            speaker=current_speaker,
            text=' '.join(current_text)
        ))
    
    return segments

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("application:app", host="0.0.0.0", port=5000, reload=True)