"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import {
  Hash,
  Info,
  MessageCircle,
  Mic,
  MoreHorizontal,
  PanelLeft,
  Paperclip,
  Send,
  Settings2,
  Smile,
  Wand2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Speaker = "user" | "bot" | "agent";

const presetSuggestions: Record<string, string> = {
  "travel-concierge":
    "Where are you traveling and what kind of luggage setup do you want for the trip?",
  "product-specialist":
    "Which matters most to you right now: durability, weight, or interior organization?",
  "brand-voice":
    "What tone should the reply take: refined, warm, or bold and confident?",
  "support-agent":
    "What issue are you seeing, and when did it start?",
};

const sessionHistory = [
  {
    id: "session-1",
    title: "Custom suitcase design",
    preview: "I want a suitcase that stands out.",
    time: "Today · 10:38",
    active: true,
  },
  {
    id: "session-2",
    title: "Delivery update",
    preview: "Can I change the delivery address?",
    time: "Yesterday · 18:12",
  },
  {
    id: "session-3",
    title: "Carry-on sizing",
    preview: "Do you have a carry-on version?",
    time: "Yesterday · 09:41",
  },
  {
    id: "session-4",
    title: "Bulk order pricing",
    preview: "Need help with a bulk order.",
    time: "Mon · 14:07",
  },
  {
    id: "session-5",
    title: "Premium handles",
    preview: "Looking for premium handles.",
    time: "Mon · 09:22",
  },
  {
    id: "session-6",
    title: "Wheel customization",
    preview: "Can I get custom wheels?",
    time: "Sun · 20:05",
  },
  {
    id: "session-7",
    title: "Invoice copy",
    preview: "Can I get an invoice copy?",
    time: "Sun · 12:48",
  },
  {
    id: "session-8",
    title: "Zipper issue",
    preview: "The zipper is stuck.",
    time: "Sat · 16:19",
  },
];

const presetExperts = [
  {
    id: "travel-concierge",
    name: "Travel Concierge",
    agentName: "Kate",
    description: "Curated travel planning and premium trip advice.",
    systemPrompt:
      "You are a travel concierge. Deliver premium trip guidance, thoughtful itineraries, and upscale service tone.",
  },
  {
    id: "product-specialist",
    name: "Product Specialist",
    agentName: "Noah",
    description: "Deep product knowledge and feature comparisons.",
    systemPrompt:
      "You are a product specialist. Be precise, technical when needed, and compare options clearly.",
  },
  {
    id: "brand-voice",
    name: "Brand Voice",
    agentName: "Iris",
    description: "Refined tone, storytelling, and brand consistency.",
    systemPrompt:
      "You are the brand voice. Keep responses refined, poetic but practical, and aligned with luxury positioning.",
  },
  {
    id: "support-agent",
    name: "Support Agent",
    agentName: "Alex",
    description: "Calm troubleshooting and resolution-focused help.",
    systemPrompt:
      "You are a support agent. Be calm, empathetic, and focused on resolution steps.",
  },
];

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

function speakerFor(message: UIMessage): Speaker {
  if (message.role === "user") return "user";
  return message.data?.speaker === "agent" ? "agent" : "bot";
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return letters.join("").toUpperCase() || "AI";
}

export default function BotchatDashboard() {
  const { messages, sendMessage, status } = useChat({
    api: "/api/chat",
  });
  const [input, setInput] = useState("");
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePresetId, setActivePresetId] = useState(presetExperts[0]?.id);
  const activePreset = useMemo(
    () => presetExperts.find((preset) => preset.id === activePresetId),
    [activePresetId]
  );
  const botName = activePreset?.agentName ?? "Kate";
  const botInitials = initialsFromName(botName);
  const suggestionText =
    presetSuggestions[activePresetId] ??
    "Tell me the context and I will draft a clear, brand-safe reply.";

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status === "submitted") return;
    sendMessage(
      { text: trimmed },
      { body: { presetId: activePresetId } }
    );
    setInput("");
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className="min-h-dvh w-full"
    >
      <Sidebar
        collapsible="icon"
        className="border border-white/60 bg-[var(--panel-soft)]/90 shadow-[0_20px_60px_-40px_rgba(30,20,60,0.45)] backdrop-blur"
        mobileBehavior="icon"
      >
        <SidebarHeader className="gap-4 pb-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:pb-0">
          <div className="flex items-center justify-between px-3 pt-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <span className="font-[var(--font-display)] text-base font-semibold tracking-tight">
                Sessions
              </span>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {sessionHistory.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                onClick={() => setSidebarOpen((open) => !open)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SidebarSeparator className="bg-black/10 group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent className="px-3 pt-2 group-data-[collapsible=icon]:hidden">
          <SidebarMenu className="gap-3">
            {sessionHistory.map((item, index) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={item.active}
                  tooltip={item.title}
                  className={cn(
                    "rounded-2xl py-3.5 px-3 min-h-[68px]",
                    "group-data-[collapsible=icon]:min-h-[52px] group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
                    item.active
                      ? "bg-white shadow-[0_18px_40px_-28px_rgba(32,24,70,0.6)]"
                      : "hover:bg-white/70"
                  )}
                >
                  <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
                    <AvatarFallback className="bg-[var(--user-bubble)] text-[10px] font-semibold group-data-[collapsible=icon]:text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.time}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.preview}
                    </p>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="px-4 py-6 lg:px-8">
        <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col">
          <section className="relative flex min-h-dvh flex-col rounded-[32px] border border-white/60 bg-[var(--panel-strong)]/85 shadow-[0_30px_80px_-45px_rgba(24,30,70,0.5)] backdrop-blur">
            <div className="flex items-center justify-between px-8 pt-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Active chat
                </p>
                <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight">
                  {botName}
                </h1>
                {activePreset ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Preset: {activePreset.name}
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
                          {activePreset?.name ?? "Assistant"}
                        </p>
                      </div>
                      {activePreset?.description ? (
                        <p className="text-xs text-muted-foreground">
                          {activePreset.description}
                        </p>
                      ) : null}
                      <div className="rounded-lg border border-border/60 bg-muted/40 p-2 text-[11px] leading-relaxed text-foreground/80">
                        {activePreset?.systemPrompt ??
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
                <span>Chat started: Today, 10:38</span>
                <Separator className="flex-1 bg-black/10" />
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div className="absolute left-10 top-6 z-10 flex items-start gap-4">
                  <span className="relative text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent-line)]">
                  Suggested questions
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

              <ScrollArea className="h-full px-8 pt-28">
                <div className="space-y-6 pb-32">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      botInitials={botInitials}
                    />
                  ))}
                  {status === "submitted" && (
                    <MessageBubble
                      message={{
                        id: "streaming",
                        role: "assistant",
                        parts: [{ type: "text", text: "Thinking..." }],
                      }}
                      botInitials={botInitials}
                    />
                  )}
                </div>
              </ScrollArea>
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
                    <TooltipProvider>
                      <div className="flex flex-wrap items-center gap-2">
                        <ToolbarIcon icon={MessageCircle} label="Message type" />
                        <ToolbarIcon icon={Mic} label="Voice note" />
                        <ToolbarIcon icon={Hash} label="Topic tags" />
                        <ToolbarIcon icon={Paperclip} label="Attach files" />
                        <ToolbarIcon icon={Smile} label="Emoji" />
                        <ToolbarIcon icon={Wand2} label="AI assist" highlight />
                      </div>
                    </TooltipProvider>
                    <Button
                      type="submit"
                      disabled={status === "submitted"}
                      className="rounded-full bg-black px-6 text-sm text-white hover:bg-black/90 disabled:opacity-60"
                    >
                      Send
                      <Send className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Preset experts</span>
                  {presetExperts.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setActivePresetId(preset.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition",
                        preset.id === activePresetId
                          ? "bg-[var(--accent-line)] text-white shadow-[0_10px_22px_-16px_rgba(126,92,186,0.7)]"
                          : "bg-[var(--accent-line)]/10 text-[var(--accent-line)] hover:bg-[var(--accent-line)]/20"
                      )}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                {activePreset ? (
                  <p className="text-xs text-muted-foreground">
                    {activePreset.description}
                  </p>
                ) : null}
              </form>
            </div>
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
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

function MessageBubble({
  message,
  botInitials,
}: {
  message: UIMessage;
  botInitials: string;
}) {
  const text = messageText(message);
  const speaker = speakerFor(message);
  const isUser = speaker === "user";
  const parts = (message as UIMessage).parts ?? [];
  const fileParts = parts.filter((part) => part.type === "file") as Array<{
    type: "file";
    mediaType: string;
    filename?: string;
    url: string;
  }>;

  return (
    <div
      className={cn(
        "flex items-end gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            speaker === "user" && "bg-[var(--user-bubble)] text-foreground",
            speaker === "bot" && "bg-[var(--accent-line)]/20 text-[var(--accent-line)]",
            speaker === "agent" && "bg-[var(--agent-bubble)] text-white"
          )}
        >
          {speaker === "user" ? "ME" : speaker === "agent" ? "AG" : botInitials}
        </AvatarFallback>
      </Avatar>
        <div
          className={cn(
            "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            speaker === "user" && "bg-[var(--user-bubble)] text-foreground",
            speaker === "bot" &&
              "bg-[linear-gradient(135deg,var(--bot-gradient-start),var(--bot-gradient-end))] text-white shadow-[0_12px_30px_-20px_rgba(78,69,190,0.65)]",
            speaker === "agent" &&
              "bg-[var(--agent-bubble)] text-white shadow-[0_12px_30px_-20px_rgba(20,34,90,0.7)]"
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
                  speaker === "user"
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
                      speaker === "user" ? "border-black/10" : "border-white/15"
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
                    speaker === "user"
                      ? "border-black/10 bg-white/60"
                      : "border-white/15 bg-white/10"
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
  }
