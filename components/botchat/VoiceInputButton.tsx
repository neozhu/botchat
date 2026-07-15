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

  const setRecording = useCallback(
    (nextRecording: boolean) => {
      if ((disabled && nextRecording) || nextRecording === isRecording) return;

      if (!isControlled) setInternalRecording(nextRecording);
      onRecordingChange?.(nextRecording);

      if (nextRecording) onStart?.();
      else onStop?.(elapsedSecondsRef.current);
    },
    [disabled, isControlled, isRecording, onRecordingChange, onStart, onStop]
  );

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
        disabled && !isRecording && styles.disabled,
        className
      )}
      data-recording={isRecording}
    >
      <button
        className={styles.voiceTrigger}
        type="button"
        disabled={disabled && !isRecording}
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