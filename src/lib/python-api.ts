const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

export async function processAudio(audioUrl: string) {
  const response = await fetch(`${PYTHON_API_URL}/api/process-audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio_url: audioUrl }),
  });

  if (!response.ok) {
    throw new Error("Failed to process audio");
  }

  return response.json();
}

export async function checkPythonServerHealth() {
  try {
    const response = await fetch(`${PYTHON_API_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}

