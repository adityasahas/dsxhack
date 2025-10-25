"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AudioUpload() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      toast.success("Audio uploaded successfully!");
      setAudioFile(null);
      const fileInput = document.getElementById("audio-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      router.refresh();
    } catch (error) {
      toast.error("Failed to upload audio");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
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
            disabled={isUploading}
            className="cursor-pointer file:cursor-pointer"
          />
        </div>

        {audioFile && (
          <div className="rounded-md bg-black/[.05] p-4 dark:bg-white/[.06]">
            <p className="text-sm font-semibold">Selected File</p>
            <p className="mt-1 text-sm text-muted-foreground">{audioFile.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {(audioFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        <Button type="submit" disabled={!audioFile || isUploading} className="w-full">
          {isUploading ? "Uploading..." : "Visualize"}
        </Button>
      </form>
    </div>
  );
}

