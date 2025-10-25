"use client";

import { useEffect, useRef, useState } from "react";
import type { WaveformFrame } from "@/types/audio";

interface WaveformGraphProps {
  waveform: WaveformFrame[];
  currentTime: number;
  duration: number;
}

export default function WaveformGraph({ waveform, currentTime, duration }: WaveformGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 120 });
  const currentTimeRef = useRef(currentTime);

  // Keep currentTime in a ref so animation loop can access latest value
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    console.log("WaveformGraph props:", {
      waveformLength: waveform.length,
      currentTime,
      duration,
      firstFrame: waveform[0],
      lastFrame: waveform[waveform.length - 1],
    });
  }, [waveform, currentTime, duration]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 120,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveform.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const draw = () => {
      const { width, height } = dimensions;
      
      // Set canvas resolution
      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(2, 2);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Use ref to get latest currentTime value
      const now = currentTimeRef.current;
      
      // Debug logging every 60 frames (~1 second)
      if (Math.random() < 0.016) {
        console.log("Waveform draw:", {
          now: now.toFixed(2),
          waveformLength: waveform.length,
          canvasWidth: width,
        });
      }

      // Calculate visible window - show past audio scrolling left
      const windowSize = 15; // seconds visible
      
      // Current playhead at the RIGHT edge, show past on the left
      const endTime = Math.max(now, windowSize); // Always show at least windowSize
      const startTime = endTime - windowSize;

      // Filter visible waveform frames
      const visibleFrames = waveform.filter(
        (frame) => frame.time >= startTime && frame.time <= endTime
      );

      if (visibleFrames.length === 0) return;

      // Find max amplitude for scaling
      const maxAmplitude = Math.max(...visibleFrames.map((f) => f.amplitude));

      // Draw waveform
      visibleFrames.forEach((frame) => {
        const x = ((frame.time - startTime) / windowSize) * width;
        const normalizedAmp = frame.amplitude / (maxAmplitude || 1);
        const barHeight = normalizedAmp * (height * 0.8);
        const y = height / 2;

        ctx.fillStyle = frame.color;
        ctx.fillRect(x, y - barHeight / 2, 3, barHeight);
      });

      // Draw playhead at the right edge
      const playheadX = ((now - startTime) / windowSize) * width;
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [waveform, dimensions]); // Removed currentTime from dependencies

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-md border border-solid border-black/[.08] bg-black/[.02] dark:border-white/[.145] dark:bg-white/[.02]"
      />
    </div>
  );
}

