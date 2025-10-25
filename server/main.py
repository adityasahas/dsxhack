from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
import uvicorn
import os
from urllib.parse import urlparse

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
        
        result = {
            "status": "success",
            "message": "Audio processed successfully",
            "audio_url": request.audio_url,
            "visualization_data": {
                "placeholder": True
            }
        }
        
        return JSONResponse(content=result)
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PYTHON_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

