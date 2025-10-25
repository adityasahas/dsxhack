export interface EmotionData {
  happy: number;
  sad: number;
  calm: number;
  energetic: number;
  excited: number;
  relaxed: number;
  angry: number;
  romantic: number;
  other: number;
  reasoning: string;
}

export interface WaveformFrame {
  time: number;
  amplitude: number;
  color: string;
}

export interface ChunkData {
  energy: number;
  tempo: number;
  key: string;
  emotion: EmotionData;
  image_url: string | null;
  audio_url?: string;
}

export type StreamResponse =
  | { status: "starting"; progress: number }
  | { status: "loading_audio"; progress: number }
  | { status: "waveform_ready"; progress: number; waveform: WaveformFrame[] }
  | {
      status: "processing_chunk";
      progress: number;
      chunk_number: number;
      total_chunks: number;
      data: ChunkData;
    }
  | { status: "complete"; progress: number }
  | { status: "error"; message: string };

export interface AudioProcessRequest {
  audio_url: string;
}

