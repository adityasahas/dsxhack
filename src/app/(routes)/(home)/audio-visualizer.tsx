"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { StreamResponse, ChunkData } from "@/types/audio";

export default function AudioVisualizer() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [currentChunk, setCurrentChunk] = useState<ChunkData | null>(null);
  const [chunkInfo, setChunkInfo] = useState({ current: 0, total: 0 });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return;

    setIsProcessing(true);
    setProgress(0);
    setCurrentChunk(null);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { audioUrl } = await uploadResponse.json();

      const processResponse = await fetch("http://localhost:8000/api/process-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio_url: audioUrl }),
      });

      if (!processResponse.ok) {
        throw new Error("Processing failed");
      }

      const reader = processResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data: StreamResponse = JSON.parse(line);

            if (data.status === "error") {
              throw new Error(data.message);
            }

            setProgress(data.progress);

            if (data.status === "starting") {
              setStatus("Starting...");
            } else if (data.status === "loading_audio") {
              setStatus("Loading audio...");
            } else if (data.status === "processing_chunk") {
              setStatus("Processing...");
              setCurrentChunk(data.data);
              setChunkInfo({ current: data.chunk_number, total: data.total_chunks });
            } else if (data.status === "complete") {
              setStatus("Complete!");
              toast.success("Audio processed successfully!");
            }
          } catch (err) {
            console.error("Error parsing stream:", err);
          }
        }
      }
    } catch (error) {
      toast.error("Failed to process audio");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-solid border-black/[.08] bg-card p-6 dark:border-white/[.145]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="audio-file" className="text-sm font-medium">
              Audio File
            </Label>
            <Input
              id="audio-file"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="cursor-pointer file:cursor-pointer"
            />
          </div>

          {audioFile && !isProcessing && (
            <div className="rounded-md bg-black/[.05] p-4 dark:bg-white/[.06]">
              <p className="text-sm font-semibold">Selected File</p>
              <p className="mt-1 text-sm text-muted-foreground">{audioFile.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {(audioFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{status}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/[.05] dark:bg-white/[.06]">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {chunkInfo.total > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Chunk {chunkInfo.current} of {chunkInfo.total}
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={!audioFile || isProcessing} className="w-full">
            {isProcessing ? "Processing..." : "Visualize"}
          </Button>
        </form>
      </div>

      {currentChunk && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {currentChunk.image_url && (
            <div className="overflow-hidden rounded-lg border border-solid border-black/[.08] bg-card dark:border-white/[.145]">
              <img
                src={currentChunk.image_url}
                alt="Emotion visualization"
                className="h-auto w-full animate-in fade-in zoom-in-95 duration-700"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Tempo" value={currentChunk.tempo} unit="BPM" />
            <MetricCard label="Energy" value={currentChunk.energy} decimals={4} />
            <MetricCard label="Key" value={currentChunk.key} />
          </div>

          <div className="rounded-lg border border-solid border-black/[.08] bg-card p-6 dark:border-white/[.145]">
            <h3 className="mb-4 text-sm font-semibold">Emotion Analysis</h3>
            <div className="space-y-3">
              {Object.entries(currentChunk.emotion)
                .filter(([key]) => key !== "reasoning")
                .map(([emotion, value]) => (
                  <EmotionBar
                    key={emotion}
                    emotion={emotion}
                    value={value as number}
                  />
                ))}
            </div>
            {currentChunk.emotion.reasoning && (
              <div className="mt-4 rounded-md bg-black/[.05] p-3 dark:bg-white/[.06]">
                <p className="text-xs text-muted-foreground">
                  {currentChunk.emotion.reasoning}
                </p>
              </div>
            )}
          </div>

          {audioUrl && (
            <div className="rounded-lg border border-solid border-black/[.08] bg-card p-4 dark:border-white/[.145]">
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  decimals = 0,
}: {
  label: string;
  value: number | string;
  unit?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const numValue = typeof value === "number" ? value : 0;

  useEffect(() => {
    if (typeof value === "number") {
      let start = 0;
      const end = value;
      const duration = 1000;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(start);
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [value]);

  return (
    <div className="rounded-lg border border-solid border-black/[.08] bg-card p-4 dark:border-white/[.145]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {typeof value === "string"
          ? value
          : displayValue.toFixed(decimals)}
        {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function EmotionBar({ emotion, value }: { emotion: string; value: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize text-muted-foreground">{emotion}</span>
        <span className="font-medium tabular-nums">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/[.05] dark:bg-white/[.06]">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

