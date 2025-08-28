'use client';

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

import { AudioPlayer } from "./components/audio-player";
import { TextToSpeechPromptBar } from "@/components/prompt-bar/text-to-speech";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";

export default function TextToSpeechPage() {
  const [speeches, setSpeeches] = useState<GeneratedSpeech[]>([]);
  const [selectedSpeech, setSelectedSpeech] = useState<GeneratedSpeech | null>(null);
  const [autoplay] = useState(true);

  // Load existing files from GCP bucket on page load
  useEffect(() => {
    async function loadSpeeches() {
      try {
        const res = await fetch("/api/gcp-upload");
        const data = await res.json();
        if (res.ok && data.ok) {
          setSpeeches(data.files);
        } else {
          console.error(data.error);
        }
      } catch (err) {
        console.error("Failed to fetch GCP files", err);
      }
    }
    loadSpeeches();
  }, []);

  const handleGenerateStart = useCallback((text: string) => {
    const pendingSpeech: GeneratedSpeech = {
      id: nanoid(),
      text,
      audioBase64: "",
      createdAt: new Date(),
      status: "loading",
    };
    setSpeeches((prev) => [pendingSpeech, ...prev]);
    setSelectedSpeech(pendingSpeech);
    return pendingSpeech.id;
  }, []);

  const handleGenerateComplete = useCallback(
    async (id: string, text: string, audioUrl: string) => {
      if (!audioUrl) {
        toast.error("Failed to generate speech audio");
        setSpeeches((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "error" as const } : item
          )
        );
        return;
      }

      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const filename = `${id}.mp3`;

        const formData = new FormData();
        formData.append("file", new File([blob], filename, { type: blob.type }));

        const res = await fetch("/api/gcp-upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");

        setSpeeches((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  text,
                  audioBase64: data.url,
                  status: "complete" as const,
                }
              : item
          )
        );

        setSelectedSpeech((current) =>
          current?.id === id
            ? { ...current, text, audioBase64: data.url, status: "complete" }
            : current
        );

        toast.success("Speech uploaded to cloud");
      } catch (err) {
        console.error(err);
        toast.error("Upload failed");
        setSpeeches((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "error" as const } : item
          )
        );
      }
    },
    []
  );

  return (
    <div className="relative">
      <div className="container mx-auto px-6 pt-8">
        {/* Title row */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Text to speech
        </h1>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-[1fr_340px]">
          {/* Left: stage */}
          <div className="min-h-[60vh] rounded-lg border border-white/5 p-6">
            <div className="flex h-full flex-col items-center justify-center">
              {selectedSpeech ? (
                <div className="w-full max-w-2xl space-y-4">
                  {selectedSpeech.status === "complete" && (
                    <p className="text-sm text-muted-foreground">{selectedSpeech.text}</p>
                  )}
                  {selectedSpeech.status === "loading" ? (
                    <div className="flex items-center justify-center p-10">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                    </div>
                  ) : selectedSpeech.audioBase64 ? (
                    <AudioPlayer
                      audioBase64={selectedSpeech.audioBase64}
                      autoplay={autoplay}
                    />
                  ) : null}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          {/* Right rail: previous conversions */}
          <div className="md:border-l md:border-white/10 md:pl-6">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Previous Conversions
              </h2>
            </div>

            <ScrollArea className="mt-2 h-[60vh]">
              <div>
                {speeches.map((speech) => (
                  <Card
                    key={speech.id}
                    className={cn(
                      "relative cursor-pointer rounded-md border-white/10 bg-transparent hover:bg-white/5 transition-colors",
                      selectedSpeech?.id === speech.id && "bg-white/10"
                    )}
                    onClick={() =>
                      speech.status === "complete" && setSelectedSpeech(speech)
                    }
                  >
                    <CardContent className="px-3 py-3">
                      <p className="mb-1 max-w-[260px] truncate text-sm font-medium">
                        {speech.text}
                      </p>
                      {speech.status === "loading" ? (
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-current" />
                          <span>Generating...</span>
                        </div>
                      ) : (
                        <p className="text-xs text-white/50">
                          {formatDistanceToNow(
                            // tolerate string or Date
                            new Date(speech.createdAt as unknown as string),
                            { addSuffix: true }
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Bottom prompt bar (wide, centered) */}
      <div className="pointer-events-none fixed bottom-4 left-0 right-0 px-4">
        <div className="pointer-events-auto mx-auto max-w-5xl">
          <TextToSpeechPromptBar
            onGenerateStart={handleGenerateStart}
            onGenerateComplete={handleGenerateComplete}
          />
        </div>
      </div>
    </div>
  );
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-4 text-center">
    <p className="max-w-xl text-sm text-white/70">
      Select a speech to play from the collection on the right or create a new
      conversion via the text input below.
    </p>
  </div>
);

interface GeneratedSpeech {
  id: string;
  text: string;
  audioBase64: string; // signed URL
  createdAt: Date;
  status: "loading" | "complete" | "error";
}
