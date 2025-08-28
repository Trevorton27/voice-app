'use client';

import { ChevronLeft, HelpCircle, Mic } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import AdvancedSettings, { TranscriptionOptions } from '@/app/(functionalities)/speech-to-text/components/advanced-settings';
import { AudioPlayer } from '@/app/(functionalities)/speech-to-text/components/audio-player';
import { FileUpload } from '@/app/(functionalities)/speech-to-text/components/file-upload';
import {
  TranscriptionResults,
  TranscriptionResult,
  WordGroup,
} from '@/app/(functionalities)/speech-to-text/components/transcription-results';
import { createTranscription } from '@/app/actions/create-transcription';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { STT_MODELS } from '@/lib/schemas';
import { groupWordsBySpeaker } from './lib/transcription-utils';

type ViewState = 'upload' | 'result';

export default function Page() {
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [helpOpen, setHelpOpen] = useState(false);

  const [audio, setAudio] = useState<{
    file: File | null;
    url: string | null;
    isPlaying: boolean;
    currentTime: number;
  }>({
    file: null,
    url: null,
    isPlaying: false,
    currentTime: 0,
  });

  const [transcription, setTranscription] = useState<{
    data: TranscriptionResult | null;
    wordGroups: WordGroup[];
    isProcessing: boolean;
  }>({
    data: null,
    wordGroups: [],
    isProcessing: false,
  });

  const [transcriptionOptions, setTranscriptionOptions] = useState<TranscriptionOptions>({
    modelId: STT_MODELS.SCRIBE_V1,
    timestampsGranularity: 'character',
    tagAudioEvents: true,
    diarize: true,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const seekToTime = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;

        setAudio((prev) => ({ ...prev, currentTime: time }));
        if (!audio.isPlaying) {
          audioRef.current.play().catch((err) => console.error('Error playing audio:', err));
        }
      }
    },
    [audio.isPlaying]
  );

  const handleFileChange = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return;
      if (audio.url) URL.revokeObjectURL(audio.url);

      const newUrl = URL.createObjectURL(selectedFile);
      setAudio((prev) => ({ ...prev, file: selectedFile, url: newUrl }));
    },
    [audio.url]
  );

  const handleTranscribe = useCallback(async () => {
    if (!audio.file) {
      toast.error('Please upload an audio file');
      return;
    }

    setTranscription((prev) => ({ ...prev, isProcessing: true }));
    try {
      const options: TranscriptionOptions = {
        modelId: transcriptionOptions.modelId,
        timestampsGranularity: transcriptionOptions.timestampsGranularity,
        tagAudioEvents: transcriptionOptions.tagAudioEvents,
        diarize: transcriptionOptions.diarize,
      };

      if (transcriptionOptions.numSpeakers) options.numSpeakers = transcriptionOptions.numSpeakers;
      if (transcriptionOptions.languageCode?.trim()) {
        options.languageCode = transcriptionOptions.languageCode.trim();
      }

      const startTime = performance.now();
      const result = await createTranscription({ file: audio.file, ...options });
      const processingTimeMs = performance.now() - startTime;

      if (result.ok) {
        const words = Array.isArray(result.value.words) ? result.value.words : [];
        const wordGroups = transcriptionOptions.diarize ? groupWordsBySpeaker(words) : [];

        setTranscription({
          data: { ...result.value, processingTimeMs } as TranscriptionResult,
          wordGroups,
          isProcessing: false,
        });
        toast.success('Audio transcribed successfully');
        setViewState('result');
      } else {
        toast.error(result.error || 'Failed to transcribe audio');
        setTranscription((prev) => ({ ...prev, isProcessing: false }));
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('An error occurred during transcription');
      setTranscription((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [audio.file, transcriptionOptions]);

  const resetToUpload = useCallback(() => {
    setViewState('upload');
    if (audio.url) URL.revokeObjectURL(audio.url);
    setAudio({ file: null, url: null, isPlaying: false, currentTime: 0 });
    setTranscription({ data: null, wordGroups: [], isProcessing: false });
  }, [audio.url]);

  useEffect(() => {
    return () => {
      if (audio.url) URL.revokeObjectURL(audio.url);
    };
  }, [audio.url]);

  /** Download transcription.data.text as a .txt file */
  const downloadTranscriptTxt = useCallback(() => {
    const text = transcription.data?.text?.trim();
    if (!text) {
      toast.error('No transcript text to download');
      return;
    }
    const base =
      (audio.file?.name?.replace(/\.[^/.]+$/, '') || 'transcript') +
      `-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [transcription.data?.text, audio.file?.name]);

  /** ---------- UI ---------- */

  const renderUploadView = () => (
<div className="flex flex-col px-6 py-10">
  {/* Title + subcopy and Help button in the same row */}
  <div className="mb-10 flex items-start justify-between max-w-5xl mx-auto w-full">
    {/* Title + subcopy centered */}
    <div className="flex-1 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
        Speech to Text
      </h1>
      <p className="mt-4 text-sm md:text-base text-muted-foreground">
        Convert speech to text with timestamps and optional speaker diarization.
      </p>
    </div>

    {/* Help button on the right */}
    <Button
      variant="outline"
      size="sm"
      className="ml-10 flex items-center gap-1.5 bg-black text-white border border-white hover:bg-gray-900"
      onClick={() => setHelpOpen(true)}
    >
      <HelpCircle className="h-4 w-4" />
      How to use
    </Button>
  </div>

  {/* Uploader + settings */}
  <div className="mx-auto w-full max-w-3xl">
    <FileUpload
      file={audio.file}
      onFileChange={handleFileChange}
      disabled={transcription.isProcessing}
    />

    <div className="mt-6">
      <AdvancedSettings
        options={transcriptionOptions}
        onChange={setTranscriptionOptions}
      />
    </div>

    {/* Centered green CTA button */}
    <div className="mt-8 flex justify-center">
      <Button
        size="lg"
        onClick={handleTranscribe}
        disabled={!audio.file || transcription.isProcessing}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-8 py-3 font-semibold text-white shadow-lg hover:bg-green-500 disabled:opacity-60"
      >
        {transcription.isProcessing ? (
          <>
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Transcribing…
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            Transcribe Audio
          </>
        )}
      </Button>
    </div>
  </div>
</div>

  );

  const renderResultView = () => (
    <div className="flex flex-col px-6 py-10">
      <div className="mx-auto mb-8 flex w-full max-w-3xl items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5"
          onClick={resetToUpload}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <div className="flex items-center bg-green-600 gap-2">
     
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
            How to use
          </Button>
        </div>
      </div>

<div className="mx-auto w-full max-w-3xl space-y-6">
  <AudioPlayer
    src={audio.url}
    onPlayStateChange={(isPlaying) => setAudio((prev) => ({ ...prev, isPlaying }))}
    onTimeUpdate={(currentTime) => setAudio((prev) => ({ ...prev, currentTime }))}
    onAudioRef={(ref) => (audioRef.current = ref)}
  />

  <TranscriptionResults
    data={transcription.data}
    wordGroups={transcription.wordGroups}
    options={transcriptionOptions}
    audioCurrentTime={audio.currentTime}
    onSeekToTime={seekToTime}
  />

  {/* Centered Download Button */}
  <div className="flex justify-center">
    <Button
      onClick={downloadTranscriptTxt}
      disabled={!transcription.data?.text}
      className="bg-green-600 text-white px-[12px] py-[12px] rounded-md hover:bg-green-700"
    >
      Download .txt
    </Button>
  </div>
</div>

    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl">
      {viewState === 'upload' ? renderUploadView() : renderResultView()}

      {/* Global Help Modal (no X, close button) */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-xl rounded-xl bg-white p-6 text-slate-900 shadow-xl [&>button]:hidden">
          <DialogHeader className="text-left space-y-3">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">
              How to use Speech to Text
            </DialogTitle>
            <DialogDescription className="sr-only">
              Quick guide to converting audio into an editable transcript.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-1 space-y-4 text-[15px] leading-relaxed">
            <p>
              <strong>Upload audio:</strong> Click the upload panel and choose an audio file,
              preferably an mp3.
            </p>
            <p>
              <strong>Adjust settings in the input bar (optional):</strong> Use <em>Advanced Settings</em> to pick the model, enable <em>Diarization</em> to separate speakers, set <em>Timestamps granularity</em>, and choose language or speaker count if known.
            </p>
            <p>
              <strong>Transcribe:</strong> Press <em>Transcribe Audio</em>. You’ll see a spinner while the audio is processed.
            </p>
            <div>
              <strong>Review &amp; navigate:</strong> In the results view:
              <ul className="mt-1 list-disc pl-5">
                <li>The built-in player lets you play/pause and scrub through the audio. Clicking a word/sentence in the transcript will seek the audio to that moment.</li>
                <li>If diarization is enabled, content is grouped by speaker for easier review.</li>
              </ul>
            </div>
            <p>
              <strong>Download transcript:</strong> Use the <em>Download .txt</em> button to save the full transcript as a text file for editing or sharing.
            </p>
            <p>
              <strong>Start another:</strong> Click <em>Back</em> to return to upload, replace the file, and run another transcription.
            </p>
            <p>
              <strong>Troubleshooting:</strong> If upload fails, ensure the file type is supported and try a smaller clip. If transcription fails, retry with a different model or set the language explicitly in Advanced Settings.
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
