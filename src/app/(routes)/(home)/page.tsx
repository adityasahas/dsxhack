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
    <div className="flex min-h-screen flex-col font-[family-name:var(--font-geist-sans)]">
      {me ? (
        <>
          <main className="flex w-full flex-1 flex-col items-center gap-4 p-8 pb-20 pt-[140px] sm:p-20 sm:pt-[140px]">
            <div className="flex w-full max-w-5xl items-center justify-between">
              <div>
                <h1 className="text-4xl font-semibold">Deaftones</h1>
                <p className=" text-muted-foreground">Welcome back, {me.name}</p>
              </div>
              <SignOutButton />
            </div>
            <div className="w-full max-w-5xl">
              <AudioVisualizer />
            </div>
            <div className="w-full max-w-5xl">
              <GenerationsList />
            </div>
          </main>
        </>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-8">
          <h1 className="text-4xl font-semibold">Deaftones</h1>
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
