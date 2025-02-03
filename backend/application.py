from fastapi import FastAPI, UploadFile, Form, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
import os
from google.generativeai import GenerativeModel
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Dict, List
from pydantic import BaseModel
import speech_recognition as sr
from tempfile import NamedTemporaryFile
import shutil
from pydub import AudioSegment


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

# Initialize speech recognizer
recognizer = sr.Recognizer()

# Define response models
class Segment(BaseModel):
    speaker: str
    text: str

class PodcastResponse(BaseModel):
    success: bool
    script: str
    segments: List[Segment]

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

def limit_segments(segments: List[Segment], max_segments: int = 8) -> List[Segment]:
    limited_segments = segments[:max_segments]
    
    for i, segment in enumerate(limited_segments):
        text = segment.text
        if len(text) > 500:
            last_period = text.rfind('.')
            last_question = text.rfind('?')
            last_exclamation = text.rfind('!')
            
            end_pos = max(last_period, last_question, last_exclamation)
            
            if end_pos > 0:
                text = text[:end_pos + 1]
            
        limited_segments[i] = Segment(
            speaker=segment.speaker,
            text=text.strip()
        )
    
    return limited_segments

@app.post("/api/generate-from-transcript", response_model=PodcastResponse)
async def generate_from_transcript(transcript: str = Form(...)) -> Dict:
    try:
        if not transcript:
            raise HTTPException(status_code=400, detail="No transcript provided")

        prompt = f"""Create an engaging, detailed podcast conversation between HOST A and HOST B about the following topic. 
Make it natural and conversational, with each host contributing substantial thoughts and reactions.
Ensure all speaker labels are exactly "HOST A" or "HOST B".
Aim for at least 6-8 exchanges between hosts.
Topic: {transcript[:2000]}

Example format:
HOST A: [detailed opening thought with context]
HOST B: [engaged response with follow-up question]
HOST A: [elaborate answer with personal perspective]
HOST B: [thoughtful reaction with additional insights]
"""
        
        response = model.generate_content(prompt)
        script = response.text if response.text else "Failed to generate content"

        segments = parse_script_to_segments(script)
        limited_segments = limit_segments(segments)

        return {
            "success": True,
            "script": script,
            "segments": limited_segments
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-podcast", response_model=PodcastResponse)
async def generate_podcast(audio: UploadFile = File(...)) -> Dict:
    try:
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No audio file provided")

        # Save the uploaded file temporarily with original format
        temp_original = NamedTemporaryFile(delete=False)
        try:
            shutil.copyfileobj(audio.file, temp_original)
            temp_original.close()

            # Convert to WAV using pydub
            audio_segment = AudioSegment.from_file(temp_original.name)
            
            # Save as WAV
            with NamedTemporaryFile(delete=False, suffix='.wav') as temp_wav:
                audio_segment.export(temp_wav.name, format='wav')
                
                # Now process the WAV file
                with sr.AudioFile(temp_wav.name) as source:
                    audio_data = recognizer.record(source)
                    transcript = recognizer.recognize_sphinx(audio_data)

                # Clean up temporary files
                os.unlink(temp_original.name)
                os.unlink(temp_wav.name)

            # Generate conversation from transcript
            prompt = f"""Create an engaging, detailed podcast conversation between HOST A and HOST B about the following topic. 
Make it natural and conversational, with each host contributing substantial thoughts and reactions.
Ensure all speaker labels are exactly "HOST A" or "HOST B".
Aim for at least 6-8 exchanges between hosts.

Topic: {transcript[:2000]}

Example format:
HOST A: [detailed opening thought with context]
HOST B: [engaged response with follow-up question]
HOST A: [elaborate answer with personal perspective]
HOST B: [thoughtful reaction with additional insights]
"""
            
            response = model.generate_content(prompt)
            script = response.text if response.text else "Failed to generate content"

            # Parse and limit segments
            segments = parse_script_to_segments(script)
            limited_segments = limit_segments(segments)

            return {
                "success": True,
                "script": script,
                "segments": limited_segments
            }

        except Exception as e:
            if os.path.exists(temp_original.name):
                os.unlink(temp_original.name)
            raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("application:app", host="0.0.0.0", port=5000, reload=True)