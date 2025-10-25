# FastAPI Audio Processing Server

This is the Python backend server for audio visualization processing.

## Setup

1. **Install Python dependencies:**

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt
```


The server will start on `http://localhost:8000`

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server health status

### Process Audio
- **POST** `/api/process-audio`
- Process audio from CDN URL (only dsx.adi.gg domain allowed)
- Returns visualization data (currently placeholder)

**Request body:**
```json
{
  "audio_url": "https://dsx.adi.gg/audio/file.mp3"
}
```

**Example using curl:**
```bash
curl -X POST "http://localhost:8000/api/process-audio" \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://dsx.adi.gg/audio/file.mp3"}'
```

## Development

When you run `bun run dev` from the project root, both the Next.js app and this FastAPI server start automatically.

- Next.js: http://localhost:3000
- FastAPI: http://localhost:8000
- FastAPI Docs: http://localhost:8000/docs (interactive API documentation)

## Next Steps

- Add actual audio visualization processing logic
- Integrate with audio processing libraries (librosa, pydub, etc.)
- Fetch and process audio from CDN URL

