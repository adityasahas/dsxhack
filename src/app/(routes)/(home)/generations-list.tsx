import {listGenerations} from "@/actions/generation/list";
import { ExternalLink } from "lucide-react";

export default async function GenerationsList() {
  const generations = await listGenerations();

  if (generations.length === 0) {
    return (
      <div className="rounded-lg border border-solid border-black/[.08] bg-card p-8 text-center text-sm text-muted-foreground dark:border-white/[.145]">
        No generations yet. Upload an audio file to get started!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Generations</h2>
      <div className="space-y-4">
        {generations.map((gen) => (
          <div
            key={gen.id}
            className="rounded-lg border border-solid border-black/[.08] bg-card p-5 transition-colors hover:bg-[#f2f2f2] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-1">
                <a 
                  href={gen.audioUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-muted-foreground"
                >
                  {gen.fileName}
                  <ExternalLink className="size-3.5" />
                </a>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{gen.fileSize} MB</span>
                  <span>•</span>
                  <span>{new Date(gen.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <audio controls className="w-full sm:w-auto">
                <source src={gen.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

