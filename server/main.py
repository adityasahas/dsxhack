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

ALLOWED_DOMAIN = "dsxcdn.adi.gg"

class AudioProcessRequest(BaseModel):
    audio_url: str
    
async def process_audio_stream(audio_url: str):
    """Generator function that yields processing updates for each chunk"""
    try:
        yield json.dumps({"status": "starting", "progress": 0}) + "\n"
        await asyncio.sleep(0.1)
        
        p = Process(audio_url)
        
        yield json.dumps({"status": "loading_audio", "progress": 5}) + "\n"
        await asyncio.sleep(0.1)
        
        # Load audio and calculate full waveform upfront
        waveform_data = p.load_and_calculate_waveform()
        
        yield json.dumps({
            "status": "waveform_ready",
            "progress": 10,
            "waveform": waveform_data
        }) + "\n"
        await asyncio.sleep(0.1)
        
        for chunk_result in p.process_waveform():
            if "error" in chunk_result:
                yield json.dumps({"status": "error", "message": chunk_result["error"]}) + "\n"
                return
            
            progress = 10 + (chunk_result["chunk_number"] / chunk_result["total_chunks"]) * 90
            
            result = {
                "status": "processing_chunk",
                "progress": int(progress),
                "chunk_number": chunk_result["chunk_number"],
                "total_chunks": chunk_result["total_chunks"],
                "data": {
                    "energy": chunk_result["energy"],
                    "tempo": chunk_result["tempo"],
                    "key": chunk_result["key"],
                    "emotion": chunk_result["emotion"],
                    "image_url": chunk_result["image_url"],
                    "audio_url": audio_url
                }
            }
            yield json.dumps(result) + "\n"
            await asyncio.sleep(0.1)
        
        yield json.dumps({"status": "complete", "progress": 100}) + "\n"
        
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

