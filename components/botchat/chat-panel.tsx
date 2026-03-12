"use client";

import type { UIMessage } from "ai";
import type { FormEvent } from "react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
import { SidebarInset } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getActiveExpertCardDetails } from "@/lib/botchat/active-expert-card";
import { cn } from "@/lib/utils";
import {
  Brain,
  Hash,
  Check,
  Copy,
  Globe,
  Info,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Send,
  Smile,
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

function dayKeyFromDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatTimelineDay(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
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
  const isThinkingPlaceholder = message.id === "streaming";
  const canCopyResponse = !isUser && !isThinkingPlaceholder && text.trim();
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
                  "[&_ul]:space-y-0 [&_ul]:pl-0 [&_ul]:list-none",
                  "[&_ul>li]:relative [&_ul>li]:pl-6",
                  "[&_ul>li:before]:content-['•'] [&_ul>li:before]:absolute [&_ul>li:before]:left-0 [&_ul>li:before]:font-bold",
                  "[&_ol]:space-y-0 [&_ol]:pl-6 [&_ol]:list-decimal",
                  "[&_ol>li]:pl-2",
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
                "h-7 w-7 rounded-full border border-white/12 bg-black/20 text-white/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-150 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-black/30 hover:text-white",
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
  const activeExpertCard = getActiveExpertCardDetails(activeExpert);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const shouldShowThinking =
    status !== "ready" &&
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
          return Number.isNaN(date.getTime()) ? null : dayKeyFromDate(date);
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
          currentDayKey = dayKeyFromDate(date);
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
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 240 ? "auto" : "hidden";
  }, [input]);

  return (
    <SidebarInset className="h-dvh overflow-hidden p-3 lg:p-4">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col">
        <section className="relative flex h-full flex-col rounded-[32px] border border-white/60 bg-[var(--panel-strong)]/85 shadow-[0_30px_80px_-45px_rgba(24,30,70,0.5)] backdrop-blur">
          <div className="flex items-start justify-between gap-4 px-6 pt-4">
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
                  <MessageBubble
                    message={{
                      id: "streaming",
                      role: "assistant",
                      parts: [{ type: "text", text: "Thinking..." }],
                    }}
                    botInitials={botInitials}
                  />
                ) : null}
              </ConversationContent>
              <ConversationScrollButton className="bottom-5" />
            </Conversation>
          </div>

          <div className="px-6 pb-5">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-3 shadow-[0_18px_40px_-30px_rgba(20,20,60,0.45)]">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length === 0) return;
                    setPendingFiles((prev) => [...prev, ...files]);
                    event.currentTarget.value = "";
                  }}
                />

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

                <Textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Type a message"
                  className="max-h-60 min-h-0 resize-none overflow-y-hidden border-none bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ToolbarIcon icon={MessageCircle} label="Message type" />
                    <ToolbarIcon icon={Mic} label="Voice note" />
                    <ToolbarIcon icon={Hash} label="Topic tags" />
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
                    <ToolbarIcon icon={Smile} label="Emoji" />
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

              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Preset experts</span>
                {isLoadingExperts
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton
                        key={`expert-skeleton-${index}`}
                        className="h-6 w-24 rounded-full bg-muted/60"
                      />
                    ))
                  : experts.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => void onCreateSessionForExpert(preset.id)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium transition",
                          preset.id === activeExpertId
                            ? "bg-[var(--accent-line)] text-white shadow-[0_10px_22px_-16px_rgba(126,92,186,0.7)]"
                            : "bg-[var(--accent-line)]/10 text-[var(--accent-line)] hover:bg-[var(--accent-line)]/20"
                        )}
                      >
                        {preset.name}
                      </button>
                    ))}
              </div>
            </form>
          </div>
        </section>
      </div>
    </SidebarInset>
  );
}
