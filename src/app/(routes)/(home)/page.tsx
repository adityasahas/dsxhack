import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import SignOutButton from "../(auth)/components/button-signout";
import { getMe } from "@/actions/user";
import AudioVisualizer from "./audio-visualizer";
import GenerationsList from "./generations-list";

export default async function Home() {
  const me = await getMe();

  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-8 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20">
      {me ? (
        <main className="row-start-2 flex w-full max-w-5xl flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Audio Visualizer</h1>
              <p className="text-xs text-muted-foreground">Welcome back, {me.name}</p>
            </div>
            <SignOutButton />
          </div>
          <AudioVisualizer />
          <GenerationsList />
        </main>
      ) : (
        <main className="row-start-2 flex flex-col items-center gap-8">
          <h1 className="text-4xl font-semibold">Audio Visualizer</h1>
          <p className="text-center text-muted-foreground">
            Sign in to upload and visualize your audio files
          </p>
          <Link
            href={"/signin"}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Sign In
          </Link>
        </main>
      )}
    </div>
  );
}
