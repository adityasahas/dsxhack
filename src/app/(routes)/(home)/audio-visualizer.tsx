"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { StreamResponse, ChunkData, WaveformFrame } from "@/types/audio";
import WaveformGraph from "./waveform-graph";

export default function AudioVisualizer() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [currentChunk, setCurrentChunk] = useState<ChunkData | null>(null);
  const [displayChunk, setDisplayChunk] = useState<ChunkData | null>(null);
  const [chunkInfo, setChunkInfo] = useState({ current: 0, total: 0 });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0);
  const [allWaveform, setAllWaveform] = useState<WaveformFrame[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!currentChunk) return;

    console.log("Current chunk received:", {
      hasImage: !!currentChunk.image_url,
    });

    if (currentChunk.image_url) {
      console.log("Loading image:", currentChunk.image_url.substring(0, 100));
      const img = new Image();
      img.onload = () => {
        console.log("Image loaded successfully");
        setDisplayChunk(currentChunk);
        setImageKey((prev) => prev + 1);
      };
      img.onerror = () => {
        console.error("Failed to load image:", currentChunk.image_url);
        setDisplayChunk(currentChunk);
      };
      img.src = currentChunk.image_url;
    } else {
      console.log("No image URL, setting display chunk without image");
      setDisplayChunk(currentChunk);
    }
  }, [currentChunk]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.log("Audio ref is null!");
      return;
    }

    console.log("Setting up audio event listeners");

    const updateTime = () => {
      const time = audio.currentTime;
      const dur = audio.duration || 0;
      console.log("timeupdate fired:", time.toFixed(2), "/", dur.toFixed(2));
      setCurrentTime(time);
      setDuration(dur);
    };

    const handlePlay = () => {
      console.log("Audio play event fired, currentTime:", audio.currentTime);
    };

    const handlePause = () => {
      console.log("Audio pause event fired");
    };

    const handleLoadedMetadata = () => {
      console.log("Audio metadata loaded, duration:", audio.duration);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    // Force initial update
    if (audio.duration) {
      setDuration(audio.duration);
    }

    return () => {
      console.log("Cleaning up audio event listeners");
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioUrl]);

  // Autoplay when waveform and first chunk are ready
  useEffect(() => {
    if (allWaveform.length > 0 && displayChunk && audioRef.current) {
      console.log("Autoplay: Starting audio playback");
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Autoplay: Audio started successfully");
          })
          .catch((err) => {
            console.error("Autoplay prevented by browser:", err);
            toast.info("Click play to start audio");
          });
      }
    }
  }, [allWaveform.length, displayChunk]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProgress(0);
    setStatus("");
    toast.info("Processing cancelled");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return;

    abortControllerRef.current = new AbortController();
    setIsProcessing(true);
    setProgress(0);
    setCurrentChunk(null);
    setDisplayChunk(null);
    setAllWaveform([]);
    setCurrentTime(0);
    setDuration(0);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
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
        signal: abortControllerRef.current.signal,
      });

      if (!processResponse.ok) {
        throw new Error("Processing failed");
      }

      const reader = processResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new data to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by newlines, but keep incomplete lines in buffer
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || "";

        // Process complete lines
        for (const line of lines) {
          if (!line.trim()) continue;

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
            } else if (data.status === "waveform_ready") {
              setStatus("Waveform calculated...");
              console.log("Waveform data received:", data.waveform.length, "frames");
              setAllWaveform(data.waveform);
            } else if (data.status === "processing_chunk") {
              setStatus("Processing...");
              console.log("Received chunk data:", data.data);
              setCurrentChunk(data.data);
              setChunkInfo({ current: data.chunk_number, total: data.total_chunks });
            } else if (data.status === "complete") {
              setStatus("Complete!");
              toast.success("Audio processed successfully!");
            }
          } catch (err) {
            console.error("Error parsing stream:", err, "Line:", line.substring(0, 100));
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }
      toast.error("Failed to process audio");
      console.error(error);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  console.log("AudioVisualizer render:", {
    hasAudioFile: !!audioFile,
    isProcessing,
    hasDisplayChunk: !!displayChunk,
    allWaveformLength: allWaveform.length,
    currentTime,
    audioUrl: audioUrl ? "yes" : "no",
    shouldShowGraph: allWaveform.length > 0 && !!audioUrl,
  });

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
                className="h-8 cursor-pointer text-xs file:cursor-pointer border-none shadow-none"
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="shrink-0"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {audioUrl && (
        <div className="rounded-lg border border-solid border-black/[.08] bg-card p-3 dark:border-white/[.145]">
          <audio ref={audioRef} controls className="w-full" preload="auto">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {allWaveform.length > 0 && audioUrl && (
        <WaveformGraph
          waveform={allWaveform}
          currentTime={currentTime}
          duration={duration}
        />
      )}

      {displayChunk && (
        <div className="space-y-3">
          <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
            <div className="space-y-3">
              {displayChunk.image_url && (
                <div className="relative overflow-hidden rounded-lg border border-solid border-black/[.08] bg-card dark:border-white/[.145]">
                  <img
                    key={imageKey}
                    src={displayChunk.image_url}
                    alt="Emotion visualization"
                    className="aspect-square w-full object-cover animate-in fade-in zoom-in-95 duration-700"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Tempo" value={displayChunk.tempo} unit="BPM" decimals={0} />
              <MetricCard label="Energy" value={displayChunk.energy} decimals={3} />
              <MetricCard label="Key" value={displayChunk.key} />
            </div>

            <div className="rounded-lg border border-solid border-black/[.08] bg-card p-4 dark:border-white/[.145]">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Emotion Analysis
              </h3>
              <div className="space-y-2.5">
                {Object.entries(displayChunk.emotion)
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
              {displayChunk.emotion.reasoning && (
                <div className="mt-3 rounded-md bg-black/[.05] p-2.5 dark:bg-white/[.06] animate-in fade-in duration-500">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {displayChunk.emotion.reasoning}
                  </p>
                </div>
              )}
            </div>
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

