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

export interface ChunkData {
  energy: number;
  tempo: number;
  key: string;
  emotion: EmotionData;
  image_url: string;
  audio_url: string;
}

export interface StreamResponseBase {
  status: string;
  progress: number;
}

export interface StreamResponseStarting extends StreamResponseBase {
  status: "starting";
}

export interface StreamResponseLoading extends StreamResponseBase {
  status: "loading_audio";
}

export interface StreamResponseProcessingChunk extends StreamResponseBase {
  status: "processing_chunk";
  chunk_number: number;
  total_chunks: number;
  data: ChunkData;
}

export interface StreamResponseComplete extends StreamResponseBase {
  status: "complete";
  progress: 100;
}

export interface StreamResponseError {
  status: "error";
  message: string;
}

export type StreamResponse =
  | StreamResponseStarting
  | StreamResponseLoading
  | StreamResponseProcessingChunk
  | StreamResponseComplete
  | StreamResponseError;

export interface AudioProcessRequest {
  audio_url: string;
}

