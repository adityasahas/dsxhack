"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { StreamResponse, ChunkData } from "@/types/audio";

export default function AudioVisualizer() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [currentChunk, setCurrentChunk] = useState<ChunkData | null>(null);
  const [previousChunk, setPreviousChunk] = useState<ChunkData | null>(null);
  const [chunkInfo, setChunkInfo] = useState({ current: 0, total: 0 });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0);

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
                setPreviousChunk(currentChunk);
                setCurrentChunk(data.data);
                setChunkInfo({ current: data.chunk_number, total: data.total_chunks });
                setImageKey((prev) => prev + 1);
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
    <div className="space-y-3">
      <div className="rounded-lg border border-solid border-black/[.08] bg-card p-3 dark:border-white/[.145]">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="h-8 cursor-pointer text-xs file:cursor-pointer"
              />
            </div>
            <Button type="submit" disabled={!audioFile || isProcessing} size="sm" className="shrink-0">
              {isProcessing ? "Processing..." : "Visualize"}
            </Button>
          </div>
        </form>
      </div>

      {isProcessing && (
        <div className="rounded-lg border border-solid border-black/[.08] bg-card p-3 dark:border-white/[.145]">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{status}</span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[.05] dark:bg-white/[.06]">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {chunkInfo.total > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Chunk {chunkInfo.current} of {chunkInfo.total}
              </p>
            )}
          </div>
        </div>
      )}

      {(currentChunk || previousChunk) && (
        <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
          <div className="space-y-3">
            {(currentChunk?.image_url || previousChunk?.image_url) && (
              <div className="relative overflow-hidden rounded-lg border border-solid border-black/[.08] bg-card dark:border-white/[.145]">
                <img
                  key={imageKey}
                  src={currentChunk?.image_url || previousChunk?.image_url}
                  alt="Emotion visualization"
                  className="aspect-square w-full object-cover animate-in fade-in zoom-in-95 duration-700"
                />
              </div>
            )}

            {audioUrl && (
              <div className="rounded-lg border border-solid border-black/[.08] bg-card p-3 dark:border-white/[.145]">
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Tempo" value={currentChunk?.tempo || previousChunk?.tempo || 0} unit="BPM" decimals={0} />
              <MetricCard label="Energy" value={currentChunk?.energy || previousChunk?.energy || 0} decimals={3} />
              <MetricCard label="Key" value={currentChunk?.key || previousChunk?.key || "-"} />
            </div>

            <div className="rounded-lg border border-solid border-black/[.08] bg-card p-4 dark:border-white/[.145]">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Emotion Analysis
              </h3>
              <div className="space-y-2.5">
                {Object.entries(currentChunk?.emotion || previousChunk?.emotion || {})
                  .filter(([key]) => key !== "reasoning")
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([emotion, value], index) => (
                    <div
                      key={emotion}
                      className="animate-in slide-in-from-right-2 fade-in"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationDuration: "400ms",
                      }}
                    >
                      <EmotionBar emotion={emotion} value={value as number} />
                    </div>
                  ))}
              </div>
              {(currentChunk?.emotion.reasoning || previousChunk?.emotion.reasoning) && (
                <div className="mt-3 rounded-md bg-black/[.05] p-2.5 dark:bg-white/[.06] animate-in fade-in duration-500">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {currentChunk?.emotion.reasoning || previousChunk?.emotion.reasoning}
                  </p>
                </div>
              )}
            </div>
          </div>
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

  useEffect(() => {
    if (typeof value === "number") {
      let start = 0;
      const end = value;
      const duration = 800;
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
    <div className="rounded-lg border border-solid border-black/[.08] bg-card p-3 dark:border-white/[.145]">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {typeof value === "string" ? value : displayValue.toFixed(decimals)}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function EmotionBar({ emotion, value }: { emotion: string; value: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize">{emotion}</span>
        <span className="font-medium tabular-nums text-muted-foreground">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[.05] dark:bg-white/[.06]">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

