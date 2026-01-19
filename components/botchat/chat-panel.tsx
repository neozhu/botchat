"use client";

import type { UIMessage } from "ai";
import type { FormEvent } from "react";
import { memo } from "react";
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
import { cn } from "@/lib/utils";
import {
  Hash,
  Info,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Send,
  Smile,
  Wand2,
} from "lucide-react";

type ExpertItem = {
  id: string;
  name: string;
  agent_name?: string;
  description?: string | null;
  system_prompt?: string;
};

type SessionItem = {
  id: string;
  created_at: string;
};

export type ChatPanelProps = {
  botName: string;
  botInitials: string;
  suggestionText: string;
  activeExpert: ExpertItem | null;
  activeExpertId: string | null;
  activeSession: SessionItem | null;
  experts: ExpertItem[];
  isLoadingExperts: boolean;
  messages: UIMessage[];
  status: string;
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreateSessionForExpert: (expertId: string) => void | Promise<void>;
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

function ToolbarIcon({
  icon: Icon,
  label,
  highlight,
}: {
  icon: typeof MessageCircle;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            "h-9 w-9 rounded-full",
            highlight && "bg-[var(--accent-line)]/15 text-[var(--accent-line)]"
          )}
        >
          <Icon className="h-4 w-4" />
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
  const parts = (message as UIMessage).parts ?? [];
  const fileParts = parts.filter((part) => part.type === "file") as Array<{
    type: "file";
    mediaType: string;
    filename?: string;
    url: string;
  }>;

  return (
    <div className={cn("flex items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
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
      <div
        className={cn(
          "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
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
                "[&_code]:rounded-md [&_code]:px-1.5 [&_code]:py-0.5",
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
                  ? "[&_code]:bg-black/5 [&_pre]:bg-black/90 [&_img]:border-black/10 [&_ul>li:before]:text-black/60"
                  : "[&_code]:bg-white/15 [&_pre]:bg-white/10 [&_img]:border-white/15 [&_ul>li:before]:text-white/70"
              )}
            >
              {text}
            </MessageResponse>
          ) : null}

          {fileParts.map((part) => {
            const isImage = part.mediaType?.startsWith("image/");
            if (isImage) {
              return (
                <img
                  key={part.url}
                  src={part.url}
                  alt={part.filename ?? "image"}
                  loading="lazy"
                  className={cn(
                    "max-w-full rounded-2xl border",
                    isUser ? "border-black/10" : "border-white/15"
                  )}
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
    </div>
  );
});

export function ChatPanel({
  botName,
  botInitials,
  suggestionText,
  activeExpert,
  activeExpertId,
  activeSession,
  experts,
  isLoadingExperts,
  messages,
  status,
  input,
  setInput,
  onSubmit,
  onCreateSessionForExpert,
}: ChatPanelProps) {
  return (
    <SidebarInset className="h-dvh overflow-hidden p-4 lg:p-6">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col">
        <section className="relative flex h-full flex-col rounded-[32px] border border-white/60 bg-[var(--panel-strong)]/85 shadow-[0_30px_80px_-45px_rgba(24,30,70,0.5)] backdrop-blur">
          <div className="flex items-center justify-between px-8 pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Active chat
              </p>
              <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">
                {botName}
              </h1>
              {activeExpert ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Preset: {activeExpert.name}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <HoverCard openDelay={150}>
                <HoverCardTrigger asChild>
                  <Button size="icon" variant="ghost" className="rounded-full">
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
                        {activeExpert?.name ?? "Assistant"}
                      </p>
                    </div>
                    {activeExpert?.description ? (
                      <p className="text-xs text-muted-foreground">
                        {activeExpert.description}
                      </p>
                    ) : null}
                    <div className="rounded-lg border border-border/60 bg-muted/40 p-2 text-[11px] leading-relaxed text-foreground/80">
                      {activeExpert?.system_prompt ??
                        "You are a premium luggage brand assistant."}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <Button size="icon" variant="ghost" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="px-8 pt-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Separator className="flex-1 bg-black/10" />
              <span>
                Chat started:{" "}
                {activeSession
                  ? new Date(activeSession.created_at).toLocaleString()
                  : "—"}
              </span>
              <Separator className="flex-1 bg-black/10" />
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="absolute left-10 top-6 z-10 flex items-start gap-4">
              <span className="relative text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent-line)]">
                AI prompt suggestion
                <span className="absolute left-1/2 top-full h-8 w-px -translate-x-1/2 bg-[var(--accent-line-soft)]" />
              </span>
              <div className="relative rounded-2xl border border-[var(--accent-line-soft)] bg-white/90 px-4 py-3 text-xs shadow-[0_14px_30px_-18px_rgba(126,92,186,0.45)]">
                <p className="max-w-[260px] leading-relaxed text-foreground/80">
                  {suggestionText}
                </p>
                <Button
                  size="sm"
                  className="mt-3 h-8 rounded-full bg-[var(--accent-line)] text-white shadow-none hover:bg-[var(--accent-line)]/90"
                  onClick={() => setInput(suggestionText)}
                >
                  Use
                </Button>
                <span className="absolute -left-6 top-4 h-px w-6 bg-[var(--accent-line-soft)]" />
              </div>
            </div>

            <Conversation className="h-full">
              <ConversationContent className="gap-6 px-8 pt-28 pb-32">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    title="Start a new chat"
                    description="Pick an expert and ask a question."
                  />
                ) : null}

                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    botInitials={botInitials}
                  />
                ))}

                {status !== "ready" &&
                messages[messages.length - 1]?.role === "user" ? (
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
              <ConversationScrollButton className="bottom-6" />
            </Conversation>
          </div>

          <div className="px-8 pb-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_40px_-30px_rgba(20,20,60,0.45)]">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Type a message"
                  className="min-h-[96px] resize-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ToolbarIcon icon={MessageCircle} label="Message type" />
                    <ToolbarIcon icon={Mic} label="Voice note" />
                    <ToolbarIcon icon={Hash} label="Topic tags" />
                    <ToolbarIcon icon={Paperclip} label="Attach files" />
                    <ToolbarIcon icon={Smile} label="Emoji" />
                    <ToolbarIcon icon={Wand2} label="AI assist" highlight />
                  </div>
                  <Button
                    type="submit"
                    disabled={status !== "ready"}
                    className="rounded-full bg-black px-6 text-sm text-white hover:bg-black/90 disabled:opacity-60"
                  >
                    Send
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                          "rounded-full px-3 py-1 text-xs font-medium transition",
                          preset.id === activeExpertId
                            ? "bg-[var(--accent-line)] text-white shadow-[0_10px_22px_-16px_rgba(126,92,186,0.7)]"
                            : "bg-[var(--accent-line)]/10 text-[var(--accent-line)] hover:bg-[var(--accent-line)]/20"
                        )}
                      >
                        {preset.name}
                      </button>
                    ))}
              </div>

              {activeExpert ? (
                <p className="text-xs text-muted-foreground">
                  {activeExpert.description}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </div>
    </SidebarInset>
  );
}

