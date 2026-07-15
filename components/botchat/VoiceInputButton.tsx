"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Mic } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./VoiceInputButton.module.css";

const BASE_LEVELS = [0.36, 0.62, 0.88, 0.52, 0.78, 0.44, 0.7] as const;
const TIMER_INTERVAL_MS = 250;
const WAVEFORM_INTERVAL_MS = 115;

export interface VoiceInputButtonProps {
  recording?: boolean;
  defaultRecording?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  startLabel?: string;
  activeLabel?: string;
  stopLabel?: string;
  onRecordingChange?: (recording: boolean) => void;
  onStart?: () => void;
  onStop?: (elapsedSeconds: number) => void;
  onTranscription?: (text: string) => void;
  onError?: (error: Error) => void;
}

function formatElapsedTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function VoiceInputButton({
  recording,
  defaultRecording = false,
  disabled = false,
  className,
  icon,
  startLabel = "Start voice input",
  activeLabel = "Voice input active",
  stopLabel = "Stop voice input",
  onRecordingChange,
  onStart,
  onStop,
  onTranscription,
  onError,
}: VoiceInputButtonProps) {
  const isControlled = recording !== undefined;
  const [internalRecording, setInternalRecording] = useState(defaultRecording);
  const isRecording = recording ?? internalRecording;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(
    BASE_LEVELS.map(() => 0.28)
  );
  const startedAtRef = useRef<number | null>(null);
  const elapsedSecondsRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const reportError = useCallback(
    (error: unknown) => {
      const nextError =
        error instanceof Error ? error : new Error("Voice input failed.");
      console.error("Voice input failed", nextError);
      onError?.(nextError);
    },
    [onError]
  );

  const transcribeAudio = useCallback(
    async (audio: Blob) => {
      const formData = new FormData();
      formData.append("file", audio, "voice-input.webm");

      const response = await fetch("/api/audio/transcriptions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ASR request failed with status ${response.status}`);
      }

      const transcription = (await response.json()) as { text?: unknown };
      const text =
        typeof transcription.text === "string" ? transcription.text.trim() : "";

      if (text) onTranscription?.(text);
    },
    [onTranscription]
  );

  const startRecording = useCallback(async () => {
    if (
      disabled ||
      isRecording ||
      isStarting ||
      isTranscribing ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      if (!navigator.mediaDevices?.getUserMedia) {
        reportError(new Error("Audio recording is not supported in this browser."));
      }
      return;
    }

    setIsStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;

        const audio = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];

        if (audio.size === 0) return;

        setIsTranscribing(true);
        void transcribeAudio(audio)
          .catch(reportError)
          .finally(() => setIsTranscribing(false));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      if (!isControlled) setInternalRecording(true);
      onRecordingChange?.(true);
      onStart?.();
    } catch (error) {
      reportError(error);
    } finally {
      setIsStarting(false);
    }
  }, [
    disabled,
    isControlled,
    isRecording,
    isStarting,
    isTranscribing,
    onRecordingChange,
    onStart,
    reportError,
    transcribeAudio,
  ]);

  const setRecording = useCallback(
    (nextRecording: boolean) => {
      if (nextRecording) {
        void startRecording();
        return;
      }

      if (!isRecording) return;

      if (!isControlled) setInternalRecording(false);
      onRecordingChange?.(false);
      onStop?.(elapsedSecondsRef.current);

      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder?.state !== "inactive") mediaRecorder?.stop();
    },
    [isControlled, isRecording, onRecordingChange, onStop, startRecording]
  );

  useEffect(() => {
    return () => {
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder?.state !== "inactive") mediaRecorder?.stop();
      mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      startedAtRef.current = null;
      elapsedSecondsRef.current = 0;
      setElapsedSeconds(0);
      setWaveformLevels(BASE_LEVELS.map(() => 0.28));
      return;
    }

    startedAtRef.current = Date.now();
    elapsedSecondsRef.current = 0;
    setElapsedSeconds(0);

    const updateElapsedTime = () => {
      if (startedAtRef.current === null) return;
      const nextElapsedSeconds = Math.floor(
        (Date.now() - startedAtRef.current) / 1_000
      );
      elapsedSecondsRef.current = nextElapsedSeconds;
      setElapsedSeconds(nextElapsedSeconds);
    };
    const updateWaveform = () => {
      setWaveformLevels(
        BASE_LEVELS.map((baseLevel) =>
          Math.max(0.25, Math.min(1, baseLevel + Math.random() * 0.42 - 0.16))
        )
      );
    };

    updateWaveform();
    const timerId = window.setInterval(updateElapsedTime, TIMER_INTERVAL_MS);
    const waveformId = window.setInterval(updateWaveform, WAVEFORM_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
      window.clearInterval(waveformId);
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setRecording(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isRecording, setRecording]);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Escape" || !isRecording) return;
    event.stopPropagation();
    setRecording(false);
  };

  return (
    <div
      className={cn(
        styles.voiceControl,
        isRecording && styles.recording,
        (disabled || isStarting || isTranscribing) && !isRecording && styles.disabled,
        className
      )}
      data-recording={isRecording}
    >
      <button
        className={styles.voiceTrigger}
        type="button"
        disabled={(disabled || isStarting || isTranscribing) && !isRecording}
        aria-label={isRecording ? activeLabel : startLabel}
        aria-pressed={isRecording}
        title={isRecording ? activeLabel : startLabel}
        onClick={() => setRecording(!isRecording)}
        onKeyDown={handleTriggerKeyDown}
      >
        {icon ?? <Mic aria-hidden="true" />}
      </button>

      <div
        className={styles.recordingContent}
        aria-hidden={!isRecording}
        aria-live="polite"
      >
        <span className={styles.recordingDot} aria-hidden="true" />
        <span className={styles.recordingTime}>
          {formatElapsedTime(elapsedSeconds)}
        </span>
        <div className={styles.waveform} aria-hidden="true">
          {waveformLevels.map((level, index) => (
            <span
              key={index}
              style={
                {
                  "--voice-level": level,
                  "--voice-opacity": 0.52 + level * 0.48,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <button
          className={styles.stopRecording}
          type="button"
          tabIndex={isRecording ? 0 : -1}
          aria-label={stopLabel}
          title={stopLabel}
          onClick={() => setRecording(false)}
        >
          <span aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
