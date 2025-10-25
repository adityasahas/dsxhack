from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import os
import json
import asyncio
from urllib.parse import urlparse
from Process import Process



app = FastAPI(title="Audio Visualizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_DOMAIN = "dsx.adi.gg"

class AudioProcessRequest(BaseModel):
    audio_url: str
async def process_audio_stream(audio_url: str):
    """Generator function that yields processing updates"""
    try:
        # Initial status
        yield json.dumps({"status": "starting", "progress": 0}) + "\n"
        await asyncio.sleep(0.1)  # Small delay for demo
        
        # Process audio
        p = Process(audio_url)
        
        # Yield waveform loading status
        yield json.dumps({"status": "loading_waveform", "progress": 20}) + "\n"
        wave_result = p.process_waveform()
        if isinstance(wave_result, str) and "Could not load" in wave_result:
            yield json.dumps({"status": "error", "message": wave_result}) + "\n"
            return
        
        # Yield chunking status
        yield json.dumps({"status": "chunking", "progress": 40}) + "\n"
        chunks = p.chunk()
        
        # Yield energy calculation status
        yield json.dumps({"status": "calculating_energy", "progress": 60}) + "\n"
        energy = p.get_energy()
        yield json.dumps({"status": "energy_complete", "data": {"energy": energy}, "progress": 70}) + "\n"
        
        # Yield tempo calculation status
        yield json.dumps({"status": "calculating_tempo", "progress": 80}) + "\n"
        tempo = p.get_tempo()
        yield json.dumps({"status": "tempo_complete", "data": {"tempo": tempo}, "progress": 85}) + "\n"
        
        # Yield key detection status
        yield json.dumps({"status": "detecting_key", "progress": 90}) + "\n"
        key = p.get_key()
        yield json.dumps({"status": "key_complete", "data": {"key": key}, "progress": 95}) + "\n"
        
        # Final emotion calculation
        yield json.dumps({"status": "calculating_emotion", "progress": 98}) + "\n"
        emotion = p.calculate_emotion()
        
        # Send final result
        final_result = {
            "status": "complete",
            "progress": 100,
            "data": {
                "energy": energy,
                "tempo": tempo,
                "key": key,
                "emotion": emotion,
                "audio_url": audio_url
            }
        }
        yield json.dumps(final_result) + "\n"
        
    except Exception as e:
        yield json.dumps({"status": "error", "message": str(e)}) + "\n"
@app.get("/")
def read_root():
    return {"message": "Audio Visualizer API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/process-audio")
async def process_audio(request: AudioProcessRequest):
    try:
        parsed_url = urlparse(request.audio_url)
        
        if parsed_url.netloc != ALLOWED_DOMAIN:
            raise HTTPException(
                status_code=400,
                detail=f"Only URLs from {ALLOWED_DOMAIN} are allowed"
            )
        
        return StreamingResponse(
            process_audio_stream(request.audio_url),
            media_type="application/x-ndjson"  # Newline-delimited JSON
        )
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")


if __name__ == "__main__":
    port = int(os.getenv("PYTHON_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

