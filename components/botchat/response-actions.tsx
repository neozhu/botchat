"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractEnglishSpeechText } from "@/lib/botchat/tts-text";
import { requestEnglishSpeech } from "@/lib/botchat/speech-client";
import { cn } from "@/lib/utils";

type SpeechState = "idle" | "loading" | "playing";

// All reply and quote toolbars share one playback slot in this browser.
let activeSpeech: { owner: object; stop: () => void } | null = null;

function SpeechWaveformIcon() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className="h-3.5 w-3.5 overflow-hidden"
    >
      <motion.path
        d="M0 7H2L3 6L4 9L5.5 2L7 12L8.5 7H14M14 7H16L17 6L18 9L19.5 2L21 12L22.5 7H28"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={shouldReduceMotion ? undefined : { x: [0, -14] }}
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 1.15,
                ease: "linear",
                repeat: Infinity,
              }
        }
      />
    </svg>
  );
}

export function ResponseActions({ text, target = "response", className }: {
  text: string;
  target?: "response" | "quote";
  className?: string;
}) {
  const speechInput = useMemo(() => extractEnglishSpeechText(text), [text]);
  const [copied, setCopied] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechRequestRef = useRef<AbortController | null>(null);
  const ownerRef = useRef({});

  const resetSpeech = useCallback(() => {
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    if (activeSpeech?.owner === ownerRef.current) activeSpeech = null;
    setSpeechState("idle");
  }, []);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    if (activeSpeech?.owner === ownerRef.current) activeSpeech = null;
  }, [resetSpeech]);

  const handleCopy = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy text", error);
    }
  };

  const handleReadResponse = async () => {
    if (!speechInput || speechState !== "idle") return;
    activeSpeech?.stop();
    const controller = new AbortController();
    speechRequestRef.current = controller;
    activeSpeech = { owner: ownerRef.current, stop: resetSpeech };
    setSpeechState("loading");

    try {
      const blob = await requestEnglishSpeech(text, controller.signal);
      if (!blob || controller.signal.aborted) return;
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioUrlRef.current = audioUrl;
      audioRef.current = audio;
      const handlePlaybackDone = () => {
        if (audioRef.current === audio) resetSpeech();
      };
      audio.addEventListener("ended", handlePlaybackDone, { once: true });
      audio.addEventListener("error", handlePlaybackDone, { once: true });
      setSpeechState("playing");
      await audio.play();
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Failed to play speech", error);
        resetSpeech();
      }
    }
  };

  const speechLabel = speechState === "loading"
    ? "Preparing speech"
    : speechState === "playing"
      ? target === "quote" ? "Reading quote aloud" : "Reading response aloud"
      : !speechInput ? "No English text to read"
        : target === "quote" ? "Read quote aloud" : "Read response aloud";
  const isSpeechActive = speechState !== "idle";
  const buttonClass = "h-7 w-7 rounded-full border border-white/12 bg-black/20 text-white/80 shadow-sm backdrop-blur-sm hover:bg-black/30 hover:text-white disabled:pointer-events-none";
  const activeClass = target === "quote"
    ? "border-white/40 bg-black/45 text-white"
    : "border-[var(--accent-line)]/40 bg-white/90 text-[var(--accent-line)] hover:bg-white";

  return (
    <div className={cn("flex items-center gap-1", className, (isSpeechActive || copied) && "opacity-100 pointer-events-auto")}>
      <Button type="button" size="icon" variant="ghost" aria-label={speechLabel}
        disabled={isSpeechActive || !speechInput} aria-busy={speechState === "loading"}
        className={cn(buttonClass, isSpeechActive && activeClass)}
        onClick={() => void handleReadResponse()}>
        {speechState === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : speechState === "playing" ? <SpeechWaveformIcon /> : <Volume2 className="h-3.5 w-3.5" />}
      </Button>
      <Button type="button" size="icon" variant="ghost" disabled={!text.trim()}
        aria-label={copied ? "Copied" : target === "quote" ? "Copy quote" : "Copy response"}
        className={cn(buttonClass, copied && activeClass)} onClick={() => void handleCopy()}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
