"use client";

import type { UIMessage } from "ai";
import type {
  ClipboardEvent,
  DragEvent,
  FormEvent,
  MouseEvent,
  PointerEvent,
} from "react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSidebarChrome } from "@/lib/botchat/sidebar-chrome";
import { getActiveExpertCardDetails } from "@/lib/botchat/active-expert-card";
import {
  normalizeClipboardFiles,
  shouldPreventClipboardPasteDefault,
} from "@/lib/botchat/chat-clipboard";
import { getComposerTextareaSizing } from "@/lib/botchat/chat-composer";
import { formatTimelineDay, getTimelineDayKey } from "@/lib/botchat/chat-timeline";
import {
  THINKING_BUBBLE_DOT_CLASSNAMES,
  THINKING_BUBBLE_TEXT,
  getThinkingBubbleMotion,
} from "@/lib/botchat/thinking-bubble";
import { cn } from "@/lib/utils";
import {
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe,
  Info,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Send,
  Wand2,
  X,
} from "lucide-react";

type ExpertItem = {
  id: string;
  name: string;
  agent_name?: string;
  description?: string | null;
  system_prompt?: string;
};

type DatedMessage = UIMessage & {
  createdAt?: string | null;
};

type ChatTimelineItem =
  | {
      type: "separator";
      key: string;
      label: string;
    }
  | {
      type: "message";
      key: string;
      message: UIMessage;
    };

export type ChatPanelProps = {
  botName: string;
  botInitials: string;
  suggestionText: string;
  activeExpert: ExpertItem | null;
  activeExpertId: string | null;
  experts: ExpertItem[];
  isLoadingExperts: boolean;
  messages: UIMessage[];
  messageTimestamps: Record<string, string>;
  status: string;
  input: string;
  setInput: (value: string) => void;
  isHighReasoning: boolean;
  isWebSearchEnabled: boolean;
  onToggleReasoning: () => void;
  onToggleWebSearch: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreateSessionForExpert: (expertId: string) => void | Promise<void>;
  pendingFiles: File[];
  setPendingFiles: (files: File[] | ((prev: File[]) => File[])) => void;
  isUploadingAttachments?: boolean;
};

function messageText(message: UIMessage) {
  const parts = (message as UIMessage).parts ?? [];
  const textParts = parts.filter((part) => part.type === "text");
  if (textParts.length > 0) {
    return textParts
      .map((part) => (part.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join("\n\n");
  }
  return (message as { content?: string }).content ?? "";
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-[11px] text-muted-foreground">
      <Separator className="flex-1 bg-black/10" />
      <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 font-medium shadow-sm">
        {label}
      </span>
      <Separator className="flex-1 bg-black/10" />
    </div>
  );
}

function ToolbarIcon({
  icon: Icon,
  label,
  highlight,
  onClick,
  disabled,
}: {
  icon: typeof MessageCircle;
  label: string;
  highlight?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          className={cn(
            "h-8 w-8 rounded-full",
            highlight && "bg-[var(--accent-line)]/15 text-[var(--accent-line)]"
          )}
          onClick={onClick}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  botInitials,
}: {
  message: UIMessage;
  botInitials: string;
}) {
  const text = messageText(message);
  const isUser = message.role === "user";
  const hasText = text.trim().length > 0;
  const canCopyResponse = !isUser && hasText;
  const [copied, setCopied] = useState(false);
  const resetCopyStateTimeoutRef = useRef<number | null>(null);
  const parts = (message as UIMessage).parts ?? [];
  const fileParts = parts.filter((part) => part.type === "file") as Array<{
    type: "file";
    mediaType: string;
    filename?: string;
    url: string;
  }>;

  useEffect(() => {
    return () => {
      if (resetCopyStateTimeoutRef.current) {
        window.clearTimeout(resetCopyStateTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (resetCopyStateTimeoutRef.current) {
        window.clearTimeout(resetCopyStateTimeoutRef.current);
      }

      resetCopyStateTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch (error) {
      console.error("Failed to copy assistant response", error);
    }
  };

  if (!hasText && fileParts.length === 0) return null;

  return (
    <div
      className={cn(
        "group/message flex items-end gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isUser
              ? "bg-[var(--user-bubble)] text-foreground"
              : "bg-[var(--accent-line)]/20 text-[var(--accent-line)]"
          )}
        >
          {isUser ? "ME" : botInitials}
        </AvatarFallback>
      </Avatar>
      <div className="relative flex max-w-[72%] min-w-0 flex-col">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser && "bg-[var(--user-bubble)] text-foreground",
            !isUser &&
              "bg-[linear-gradient(135deg,var(--bot-gradient-start),var(--bot-gradient-end))] text-white shadow-[0_12px_30px_-20px_rgba(78,69,190,0.65)]"
          )}
        >
          <div className="space-y-3">
            {text ? (
              <MessageResponse
                className={cn(
                  "text-sm leading-relaxed",
                  "[&_a]:underline [&_a]:underline-offset-4",
                  "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5",
                  "[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:p-4",
                  "[&_img]:max-w-full [&_img]:rounded-2xl [&_img]:border",
                  "[&_ul]:mb-2 [&_ul]:space-y-0 [&_ul]:pl-0 [&_ul]:list-none",
                  "[&_ul>li]:relative [&_ul>li]:pl-6",
                  "[&_ul>li:before]:content-['•'] [&_ul>li:before]:absolute [&_ul>li:before]:left-0 [&_ul>li:before]:font-bold",
                  "[&_ol]:mb-2 [&_ol]:space-y-0 [&_ol]:pl-6 [&_ol]:list-decimal",
                  "[&_ol>li]:pl-2 [&_ol>li]:py-0.5 [&_[data-streamdown=ordered-list]>li]:!py-0.5",
                  "[&_p]:mb-3 [&_p:last-child]:mb-0",
                  "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-3",
                  "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2",
                  "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2",
                  isUser
                    ? "[&_:not(pre)>code]:bg-black/5 [&_img]:border-black/10 [&_ul>li:before]:text-black/60"
                    : "[&_:not(pre)>code]:bg-white/15 [&_img]:border-white/15 [&_ul>li:before]:text-white/70"
                )}
              >
                {text}
              </MessageResponse>
            ) : null}

            {fileParts.map((part) => {
              const isImage = part.mediaType?.startsWith("image/");
              if (isImage) {
                return (
                  <Image
                    key={part.url}
                    src={part.url}
                    alt={part.filename ?? "image"}
                    width={1200}
                    height={800}
                    sizes="(max-width: 768px) 100vw, 72vw"
                    loader={({ src }) => src}
                    unoptimized
                    className={cn(
                      "max-w-full rounded-2xl border",
                      isUser ? "border-black/10" : "border-white/15"
                    )}
                    style={{ height: "auto" }}
                  />
                );
              }

              return (
                <a
                  key={part.url}
                  href={part.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium underline-offset-4 hover:underline",
                    isUser ? "border-black/10 bg-white/60" : "border-white/15 bg-white/10"
                  )}
                >
                  {part.filename ?? "Open file"}
                </a>
              );
            })}
          </div>
        </div>

        {canCopyResponse ? (
          <div className="absolute right-2 bottom-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={copied ? "Copied" : "Copy response"}
              className={cn(
                "h-7 w-7 rounded-full border border-white/12 bg-black/20 text-white/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-150 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-black/30 hover:text-white [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100",
                copied &&
                  "opacity-100 pointer-events-auto border-[var(--accent-line)]/40 bg-white/90 text-[var(--accent-line)] hover:bg-white"
              )}
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
});

function ThinkingBubble({ botInitials }: { botInitials: string }) {
  const thinkingMotion = useMemo(() => getThinkingBubbleMotion(), []);

  return (
    <div className="flex items-end gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-[var(--accent-line)]/20 text-xs font-semibold text-[var(--accent-line)]">
          {botInitials}
        </AvatarFallback>
      </Avatar>
      <motion.div
        initial={thinkingMotion.container.initial}
        animate={thinkingMotion.container.animate}
        exit={thinkingMotion.container.exit}
        transition={thinkingMotion.container.transition}
        className="relative flex max-w-[72%] min-w-0 flex-col"
      >
        <div
          role="status"
          aria-live="polite"
          aria-label={THINKING_BUBBLE_TEXT}
          className="flex min-h-[44px] items-center rounded-2xl bg-[linear-gradient(135deg,var(--bot-gradient-start),var(--bot-gradient-end))] px-4 py-2.5 text-sm leading-relaxed text-white shadow-[0_12px_30px_-20px_rgba(78,69,190,0.65)]"
        >
          <span className="sr-only">{THINKING_BUBBLE_TEXT}</span>
          <motion.div
            animate="jump"
            transition={thinkingMotion.dotsTransition}
            className="flex items-center gap-2"
          >
            {THINKING_BUBBLE_DOT_CLASSNAMES.map((className) => (
              <motion.span
                key={className}
                variants={thinkingMotion.dotVariants}
                className={cn(
                  className,
                  "block h-2 w-2 rounded-full bg-white/85 will-change-transform"
                )}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export function ChatPanel({
  botName,
  botInitials,
  suggestionText,
  activeExpert,
  activeExpertId,
  experts,
  isLoadingExperts,
  messages,
  messageTimestamps,
  status,
  input,
  setInput,
  isHighReasoning,
  isWebSearchEnabled,
  onToggleReasoning,
  onToggleWebSearch,
  onSubmit,
  onCreateSessionForExpert,
  pendingFiles,
  setPendingFiles,
  isUploadingAttachments,
}: ChatPanelProps) {
  const isMobile = useIsMobile();
  const sidebarChrome = getSidebarChrome(isMobile);
  const activeExpertCard = getActiveExpertCardDetails(activeExpert);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const presetExpertsScrollerRef = useRef<HTMLDivElement | null>(null);
  const dragDepthRef = useRef(0);
  const presetExpertsDragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startScrollLeft: 0,
  });
  const suppressPresetExpertClickRef = useRef(false);
  const [isTextareaDragActive, setIsTextareaDragActive] = useState(false);
  const [isPresetExpertsDragging, setIsPresetExpertsDragging] = useState(false);
  const previews = useMemo(
    () =>
      pendingFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [pendingFiles]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const canSend = status === "ready" && !isUploadingAttachments;
  const showPromptSuggestion = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const lastMessageHasText = lastMessage
    ? messageText(lastMessage).trim().length > 0
    : false;
  const lastUserIndex = messages.reduce(
    (lastIndex, message, index) =>
      message.role === "user" ? index : lastIndex,
    -1
  );
  const hasAssistantTextAfterLastUser =
    lastUserIndex >= 0 &&
    messages
      .slice(lastUserIndex + 1)
      .some(
        (message) =>
          message.role === "assistant" &&
          messageText(message).trim().length > 0
      );
  const shouldShowThinking =
    status !== "ready" &&
    !hasAssistantTextAfterLastUser &&
    (!!lastMessage &&
      (lastMessage.role === "user" ||
        (lastMessage.role === "assistant" && !lastMessageHasText)));

  const totalBytes = useMemo(
    () => pendingFiles.reduce((sum, file) => sum + file.size, 0),
    [pendingFiles]
  );

  const attachmentSummary = useMemo(() => {
    if (pendingFiles.length === 0) return null;
    const count = pendingFiles.length;
    const mb = totalBytes / (1024 * 1024);
    return `${count} file${count === 1 ? "" : "s"} • ${mb.toFixed(1)} MB`;
  }, [pendingFiles.length, totalBytes]);

  const timelineItems = useMemo(() => {
    const datedMessages = messages.reduce<DatedMessage[]>((acc, message) => {
      const createdAt = messageTimestamps[message.id] ?? null;

      if (
        status !== "ready" &&
        message.id === lastMessage?.id &&
        message.role === "assistant" &&
        messageText(message).trim().length === 0
      ) {
        return acc;
      }

      acc.push({ ...message, createdAt });
      return acc;
    }, []);

    const distinctDayKeys = new Set(
      datedMessages
        .map((message) => {
          if (!message.createdAt) return null;
          const date = new Date(message.createdAt);
          return Number.isNaN(date.getTime()) ? null : getTimelineDayKey(date);
        })
        .filter((value): value is string => Boolean(value))
    );

    const shouldShowDaySeparators = distinctDayKeys.size > 1;
    const items: ChatTimelineItem[] = [];
    let lastDayKey: string | null = null;

    for (const message of datedMessages) {
      let currentDayKey: string | null = null;
      let currentDayLabel: string | null = null;

      if (message.createdAt) {
        const date = new Date(message.createdAt);
        if (!Number.isNaN(date.getTime())) {
          currentDayKey = getTimelineDayKey(date);
          currentDayLabel = formatTimelineDay(date);
        }
      }

      if (
        shouldShowDaySeparators &&
        currentDayKey &&
        currentDayLabel &&
        currentDayKey !== lastDayKey
      ) {
        items.push({
          type: "separator",
          key: `day-${currentDayKey}`,
          label: currentDayLabel,
        });
      }

      items.push({
        type: "message",
        key: message.id,
        message,
      });

      if (currentDayKey) lastDayKey = currentDayKey;
    }

    return items;
  }, [lastMessage, messageTimestamps, messages, status]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const sizing = getComposerTextareaSizing({
      value: input,
      scrollHeight: textarea.scrollHeight,
    });
    textarea.style.height = `${sizing.height}px`;
    textarea.style.overflowY = sizing.overflowY;
  }, [input]);

  const appendPendingFiles = (files: File[]) => {
    if (files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const eventHasFiles = (types: Iterable<string>) => {
    for (const type of types) {
      if (type === "Files") return true;
    }
    return false;
  };

  const handleTextareaPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canSend) return;

    const clipboardItems = Array.from(event.clipboardData?.items ?? []);
    if (clipboardItems.length === 0) return;

    const pastedFiles = clipboardItems
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file instanceof File);

    if (pastedFiles.length === 0) return;

    const hasPastedText = clipboardItems.some((item) => item.kind === "string");
    const normalizedFiles = normalizeClipboardFiles(pastedFiles);

    appendPendingFiles(normalizedFiles);

    if (
      shouldPreventClipboardPasteDefault({
        hasPastedFiles: true,
        hasPastedText,
      })
    ) {
      event.preventDefault();
    }
  };

  const handleTextareaDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!canSend || !eventHasFiles(event.dataTransfer.types)) return;

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsTextareaDragActive(true);
  };

  const handleTextareaDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canSend || !eventHasFiles(event.dataTransfer.types)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    if (!isTextareaDragActive) {
      setIsTextareaDragActive(true);
    }
  };

  const handleTextareaDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!eventHasFiles(event.dataTransfer.types)) return;

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsTextareaDragActive(false);
    }
  };

  const handleTextareaDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canSend || !eventHasFiles(event.dataTransfer.types)) return;

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsTextareaDragActive(false);

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;

    appendPendingFiles(files);
    textareaRef.current?.focus();
  };

  const stopPresetExpertsDragging = (pointerId?: number) => {
    const container = presetExpertsScrollerRef.current;
    const activePointerId = presetExpertsDragRef.current.pointerId;

    if (pointerId !== undefined && activePointerId !== pointerId) {
      return;
    }

    if (container && activePointerId !== null && container.hasPointerCapture(activePointerId)) {
      container.releasePointerCapture(activePointerId);
    }

    presetExpertsDragRef.current.pointerId = null;
    presetExpertsDragRef.current.startX = 0;
    presetExpertsDragRef.current.startScrollLeft = 0;
    suppressPresetExpertClickRef.current = false;
    setIsPresetExpertsDragging(false);
  };

  const handlePresetExpertsPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const eventTarget = event.target as HTMLElement | null;
    if (eventTarget?.closest("button, a, input, textarea, select, [role='button']")) {
      return;
    }

    const container = presetExpertsScrollerRef.current;
    if (!container) {
      return;
    }

    presetExpertsDragRef.current.pointerId = event.pointerId;
    presetExpertsDragRef.current.startX = event.clientX;
    presetExpertsDragRef.current.startScrollLeft = container.scrollLeft;
    suppressPresetExpertClickRef.current = false;
    container.setPointerCapture(event.pointerId);
  };

  const handlePresetExpertsPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const container = presetExpertsScrollerRef.current;
    if (!container || presetExpertsDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - presetExpertsDragRef.current.startX;
    if (Math.abs(deltaX) < 4) {
      return;
    }

    suppressPresetExpertClickRef.current = true;
    setIsPresetExpertsDragging(true);
    container.scrollLeft = presetExpertsDragRef.current.startScrollLeft - deltaX;
    event.preventDefault();
  };

  const handlePresetExpertsClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressPresetExpertClickRef.current) {
      return;
    }

    suppressPresetExpertClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const scrollPresetExperts = (direction: "previous" | "next") => {
    const container = presetExpertsScrollerRef.current;
    if (!container) {
      return;
    }

    const distance = Math.max(container.clientWidth * 0.75, 160);
    container.scrollBy({
      left: direction === "previous" ? -distance : distance,
      behavior: "smooth",
    });
  };

  return (
    <SidebarInset className="h-dvh overflow-hidden p-3 lg:p-4">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col">
        <section className="relative flex h-full flex-col rounded-[32px] border border-white/60 bg-[var(--panel-strong)]/85 shadow-[0_30px_80px_-45px_rgba(24,30,70,0.5)] backdrop-blur">
          <div className="flex items-start justify-between gap-4 px-6 pt-4">
            <div className="flex min-w-0 items-start gap-3">
              {sidebarChrome.showChatTrigger ? (
                <SidebarTrigger className="mt-0.5 h-9 w-9 rounded-full md:hidden" />
              ) : null}
              <div className="min-w-0 space-y-0">
                {activeExpert ? (
                  <p className="truncate text-[11px] text-muted-foreground">
                    Preset: {activeExpert.name}
                  </p>
                ) : null}
                <h1 className="truncate font-[var(--font-display)] text-[1.6rem] leading-none font-semibold tracking-tight">
                  {botName}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HoverCard openDelay={150}>
                <HoverCardTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Active expert
                      </p>
                      <p className="text-sm font-semibold">
                        {activeExpertCard.name}
                      </p>
                    </div>
                    {activeExpertCard.description ? (
                      <p className="text-xs text-muted-foreground">
                        {activeExpertCard.description}
                      </p>
                    ) : null}
                  </div>
                </HoverCardContent>
              </HoverCard>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {showPromptSuggestion ? (
              <div className="absolute left-8 top-4 z-10 flex items-start gap-3">
                <span className="relative text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent-line)]">
                  AI prompt suggestion
                  <span className="absolute left-1/2 top-full h-6 w-px -translate-x-1/2 bg-[var(--accent-line-soft)]" />
                </span>
                <div className="relative rounded-2xl border border-[var(--accent-line-soft)] bg-white/90 px-4 py-2.5 text-xs shadow-[0_14px_30px_-18px_rgba(126,92,186,0.45)]">
                  <p className="max-w-[260px] leading-relaxed text-foreground/80">
                    {suggestionText}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2.5 h-7 rounded-full bg-[var(--accent-line)] px-3 text-white shadow-none hover:bg-[var(--accent-line)]/90"
                    onClick={() => setInput(suggestionText)}
                  >
                    Use
                  </Button>
                  <span className="absolute -left-5 top-4 h-px w-5 bg-[var(--accent-line-soft)]" />
                </div>
              </div>
            ) : null}

            <Conversation className="h-full">
              <ConversationContent
                className={cn(
                  "gap-5 px-6 pb-24",
                  showPromptSuggestion ? "pt-24" : "pt-4"
                )}
              >
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    title="Start a new chat"
                    description="Pick an expert and ask a question."
                  />
                ) : null}

                {timelineItems.map((item) =>
                  item.type === "separator" ? (
                    <DateSeparator key={item.key} label={item.label} />
                  ) : (
                    <MessageBubble
                      key={item.key}
                      message={item.message}
                      botInitials={botInitials}
                    />
                  )
                )}

                {shouldShowThinking ? (
                  <ThinkingBubble key="thinking" botInitials={botInitials} />
                ) : null}
              </ConversationContent>
              <ConversationScrollButton className="bottom-5" />
            </Conversation>
          </div>

          <div className="px-6 pb-5">
            <form onSubmit={onSubmit} className="space-y-3">
              <div
                className={cn(
                  "relative rounded-[24px] border border-white/70 bg-white/80 p-3 shadow-[0_18px_40px_-30px_rgba(20,20,60,0.45)] transition-colors",
                  isTextareaDragActive && "bg-[var(--accent-line)]/6"
                )}
                onDragEnter={handleTextareaDragEnter}
                onDragOver={handleTextareaDragOver}
                onDragLeave={handleTextareaDragLeave}
                onDrop={handleTextareaDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length === 0) return;
                    appendPendingFiles(files);
                    event.currentTarget.value = "";
                  }}
                />

                {isTextareaDragActive ? (
                  <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-[20px] border-2 border-dashed border-[var(--accent-line)]/45 bg-[var(--accent-line)]/10">
                    <div className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-[var(--accent-line)] shadow-sm">
                      Drop files anywhere in this box to attach
                    </div>
                  </div>
                ) : null}

                {pendingFiles.length > 0 ? (
                  <div className="mb-3 rounded-2xl border border-black/10 bg-white/60 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-foreground/70">
                        Attachments
                      </p>
                      {attachmentSummary ? (
                        <p className="text-[11px] text-muted-foreground">
                          {attachmentSummary}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                      {previews.map(({ file, url }) => {
                        const isImage = file.type.startsWith("image/");
                        return (
                          <div
                            key={`${file.name}-${file.lastModified}-${file.size}`}
                            className="group relative w-36 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white"
                          >
                            <div className="relative h-24 w-full bg-muted/40">
                              {isImage ? (
                                <Image
                                  src={url}
                                  alt={file.name}
                                  fill
                                  className="object-cover"
                                  loader={({ src }) => src}
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-medium text-foreground/70">
                                  {file.name}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                              <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                                {file.name}
                              </p>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full opacity-70 hover:bg-red-500/10 hover:text-red-600 hover:opacity-100"
                                onClick={() => {
                                  setPendingFiles((prev) =>
                                    prev.filter(
                                      (f) =>
                                        !(
                                          f.name === file.name &&
                                          f.size === file.size &&
                                          f.lastModified === file.lastModified
                                        )
                                    )
                                  );
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div
                  className={cn(
                    "rounded-[20px] transition-colors",
                    isTextareaDragActive &&
                      "bg-[var(--accent-line)]/8 ring-1 ring-[var(--accent-line)]/25"
                  )}
                >
                  <Textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onPaste={handleTextareaPaste}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={
                      isTextareaDragActive
                        ? "Drop files here to attach"
                        : "Type a message"
                    }
                    className="max-h-60 min-h-0 resize-none overflow-y-hidden border-none bg-transparent p-0 text-base leading-6 shadow-none [field-sizing:fixed] focus-visible:ring-0 md:text-sm"        
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ToolbarIcon icon={MessageCircle} label="Message type" />
                    <ToolbarIcon icon={Mic} label="Voice note" />
                    <ToolbarIcon
                      icon={Brain}
                      label={isHighReasoning ? "Reasoning: High" : "Reasoning: Low"}
                      highlight={isHighReasoning}
                      onClick={onToggleReasoning}
                    />
                    <ToolbarIcon
                      icon={Globe}
                      label={
                        isWebSearchEnabled
                          ? "Web search: On"
                          : "Web search: Off"
                      }
                      highlight={isWebSearchEnabled}
                      onClick={onToggleWebSearch}
                    />
                    <ToolbarIcon
                      icon={Paperclip}
                      label="Attach files"
                      disabled={!canSend}
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <ToolbarIcon icon={Wand2} label="AI assist" highlight />
                  </div>
                  <Button
                    type="submit"
                    disabled={!canSend}
                    className="h-9 rounded-full bg-black px-5 text-sm text-white hover:bg-black/90 disabled:opacity-60"
                  >
                    Send
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Scroll preset experts left"
                  disabled={isLoadingExperts}
                  className="h-8 w-8 shrink-0 rounded-full border-[var(--accent-line)]/35 bg-white/90 text-[var(--accent-line)] shadow-sm hover:border-[var(--accent-line)]/50 hover:bg-[var(--accent-line)]/10 hover:text-[var(--accent-line)] disabled:opacity-40"
                  onClick={() => scrollPresetExperts("previous")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <div
                    ref={presetExpertsScrollerRef}
                    className={cn(
                      "flex h-8 min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x",
                      isPresetExpertsDragging ? "cursor-grabbing select-none" : "cursor-grab"
                    )}
                    onPointerDown={handlePresetExpertsPointerDown}
                    onPointerMove={handlePresetExpertsPointerMove}
                    onPointerUp={(event) => stopPresetExpertsDragging(event.pointerId)}
                    onPointerCancel={(event) => stopPresetExpertsDragging(event.pointerId)}
                    onLostPointerCapture={(event) => stopPresetExpertsDragging(event.pointerId)}
                    onClickCapture={handlePresetExpertsClickCapture}
                  >
                    <div className="flex w-max min-w-full items-center gap-1.5 whitespace-nowrap pr-1">
                      {isLoadingExperts
                        ? Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                              key={`expert-skeleton-${index}`}
                              className="h-6 w-24 shrink-0 rounded-full bg-muted/60"
                            />
                          ))
                        : experts.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => void onCreateSessionForExpert(preset.id)}
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition",
                                preset.id === activeExpertId
                                  ? "bg-[var(--accent-line)] text-white shadow-[0_10px_22px_-16px_rgba(126,92,186,0.7)]"
                                  : "bg-[var(--accent-line)]/10 text-[var(--accent-line)] hover:bg-[var(--accent-line)]/20"
                              )}
                            >
                              {preset.name}
                            </button>
                          ))}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Scroll preset experts right"
                  disabled={isLoadingExperts}
                  className="h-8 w-8 shrink-0 rounded-full border-[var(--accent-line)]/35 bg-white/90 text-[var(--accent-line)] shadow-sm hover:border-[var(--accent-line)]/50 hover:bg-[var(--accent-line)]/10 hover:text-[var(--accent-line)] disabled:opacity-40"
                  onClick={() => scrollPresetExperts("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </SidebarInset>
  );
}
