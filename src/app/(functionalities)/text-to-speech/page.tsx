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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export default function TextToSpeechPage() {
  const [speeches, setSpeeches] = useState<GeneratedSpeech[]>([]);
  const [selectedSpeech, setSelectedSpeech] = useState<GeneratedSpeech | null>(null);
  const [autoplay] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

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
      createdAt: new Date(), // local optimistic timestamp
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
        // fetch the audio data the model produced
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const filename = `${id}.mp3`;

        // send file + id + text (+ optional folder prefix) to the API route
        const formData = new FormData();
        formData.append("file", new File([blob], filename, { type: blob.type }));
        formData.append("id", id);                  // 👈 ensure id is stored
        formData.append("text", text);              // 👈 ensure text is stored
        formData.append("prefix", "speeches");      // keep objects in a folder

        const res = await fetch("/api/gcp-upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");

        // Use echoed values from server (id/text) to avoid any drift
        setSpeeches((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  id: data.id,
                  text: data.text,
                  audioBase64: data.url, // signed URL
                  status: "complete" as const,
                  createdAt: item.createdAt, // keep optimistic timestamp
                }
              : item
          )
        );

        setSelectedSpeech((current) =>
          current?.id === id
            ? { ...current, id: data.id, text: data.text, audioBase64: data.url, status: "complete" }
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Text To Speech
          </h1>

          {/* How To Use button (black bg, white text, white border) */}
          <Button
            onClick={() => setHelpOpen(true)}
            className="bg-black text-white border border-white hover:bg-gray-900"
            size="sm"
            variant="outline"
          >
            How To Use
          </Button>
        </div>

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

      {/* ---------- How To Use Modal (no top X) ---------- */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-xl rounded-xl bg-white p-6 text-slate-900 shadow-xl [&>button]:hidden">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">
              How to use Text to speech
            </DialogTitle>
            <DialogDescription className="sr-only">
              Quick guide to creating and playing speech from text.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-1 space-y-3 text-[15px] leading-relaxed">
            <p>
              <strong>1) Type your text:</strong> Use the input bar at the bottom of the page.
            </p>
            <p>
              <strong>2) Choose voice &amp; model (optional):</strong> Pick a voice and model from the
              dropdowns inside the bar.
            </p>
            <p>
              <strong>3) Generate:</strong> Submit the form to synthesize audio. A new item will appear
              under <em>Previous Conversions</em> on the right and the sound controls for the selected item will appear in the center.
            </p>
            <p>
              <strong>4) Play &amp; review:</strong> Click a conversion on the right to load it in the
              main player. Use the controls to listen.
            </p>
            <p>
              <strong>5) Create more:</strong> Add more lines of text in the bottom bar; each
              generation will be listed on the right for easy access.
            </p>
            <p className="text-slate-600">
              Tip: If a generation fails, try shorter text or a different model/voice.
            </p>
          </div>

          <DialogFooter className="mt-6 justify-end">
            <Button onClick={() => setHelpOpen(false)} className="px-6">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-4 text-center">
    <p className="max-w-xl text-sm text-white/70">
      Select a speech to play from the collection on the right.
      <br />
      OR create a new conversion via the text input below.
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
