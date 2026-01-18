"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Hash,
  Info,
  Loader2,
  MessageCircle,
  Mic,
  MoreHorizontal,
  PanelLeft,
  Paperclip,
  Send,
  Smile,
  Trash2,
  Wand2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
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

type ExpertRow = {
  id: string;
  slug: string;
  name: string;
  agent_name: string;
  description: string | null;
  system_prompt: string;
  suggestion_question: string | null;
  sort_order: number;
  created_at: string;
};

type SessionRow = {
  id: string;
  expert_id: string;
  title: string;
  last_message: string | null;
  created_at: string;
  updated_at: string;
};

const expertSeeds = [
  {
    slug: "travel-concierge",
    name: "Travel Concierge",
    agent_name: "Kate",
    description: "Curated travel planning and premium trip advice.",
    system_prompt:
      "You are a travel concierge. Deliver premium trip guidance, thoughtful itineraries, and upscale service tone.",
    suggestion_question:
      "Can you help me plan a trip — what suitcase sizes should I choose for my destination and trip length?",
    sort_order: 0,
  },
  {
    slug: "product-specialist",
    name: "Product Specialist",
    agent_name: "Noah",
    description: "Deep product knowledge and feature comparisons.",
    system_prompt:
      "You are a product specialist. Be precise, technical when needed, and compare options clearly.",
    suggestion_question:
      "Can you compare durable vs lightweight luggage — what are the tradeoffs and your recommendation?",
    sort_order: 1,
  },
  {
    slug: "brand-voice",
    name: "Brand Voice",
    agent_name: "Iris",
    description: "Refined tone, storytelling, and brand consistency.",
    system_prompt:
      "You are the brand voice. Keep responses refined, poetic but practical, and aligned with luxury positioning.",
    suggestion_question:
      "Can you rewrite my message in a refined premium tone? Here’s my draft: ",
    sort_order: 2,
  },
  {
    slug: "support-agent",
    name: "Support Agent",
    agent_name: "Alex",
    description: "Calm troubleshooting and resolution-focused help.",
    system_prompt:
      "You are a support agent. Be calm, empathetic, and focused on resolution steps.",
    suggestion_question:
      "Can you troubleshoot this step-by-step? My suitcase (handle/wheels/lock) is not working properly.",
    sort_order: 3,
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

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return letters.join("").toUpperCase() || "AI";
}

function coerceParts(value: unknown) {
  return Array.isArray(value) ? (value as UIMessage["parts"]) : [];
}

function formatRelativeTime(thenIso: string, nowMs: number) {
  const thenMs = new Date(thenIso).getTime();
  if (!Number.isFinite(thenMs)) return "—";

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - thenMs) / 1000));
  if (elapsedSeconds < 60) return "just now";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return "yesterday";
  if (elapsedDays < 7) {
    return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(thenMs));
}

export default function BotchatDashboard() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isLoadingExperts, setIsLoadingExperts] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [deletingSessionIds, setDeletingSessionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [removingSessionIds, setRemovingSessionIds] = useState<Set<string>>(
    () => new Set()
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ message }) => {
      if (!activeSessionId) return;
      const text = messageText(message).trim();
      if (!text) return;

      const now = new Date().toISOString();
      setSessions((prev) =>
        prev
          .map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  last_message: text.slice(0, 500),
                  updated_at: now,
                }
              : s
          )
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
      );
    },
  });

  const [input, setInput] = useState("");
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeExpertId, setActiveExpertId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const activeExpert = useMemo(
    () => experts.find((expert) => expert.id === activeExpertId),
    [experts, activeExpertId]
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const botName = activeExpert?.agent_name ?? "Kate";
  const botInitials = initialsFromName(botName);
  const suggestionText =
    activeExpert?.suggestion_question ?? "What should the assistant ask next?";
  const providerOpen = isMobile ? false : sidebarOpen;

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
        const { data: existingExperts } = await supabase
          .from("experts")
          .select(
            "id, slug, name, agent_name, description, system_prompt, suggestion_question, sort_order, created_at"
          )
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (cancelled) return;

        if (!existingExperts || existingExperts.length === 0) {
          await supabase.from("experts").upsert(expertSeeds, {
            onConflict: "slug",
          });
        }

        const { data: expertsAfterSeed } = await supabase
          .from("experts")
          .select(
            "id, slug, name, agent_name, description, system_prompt, suggestion_question, sort_order, created_at"
          )
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (cancelled) return;

        const loadedExperts = (expertsAfterSeed ?? []) as ExpertRow[];
        setExperts(loadedExperts);
        setIsLoadingExperts(false);

        const { data: loadedSessions } = await supabase
          .from("chat_sessions")
          .select("id, expert_id, title, last_message, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50);

        if (cancelled) return;

        const loaded = (loadedSessions ?? []) as SessionRow[];
        setSessions(loaded);
        setIsLoadingSessions(false);

        if (loaded.length > 0) {
          const current = loaded[0];
          setActiveSessionId(current.id);
          setActiveExpertId(current.expert_id);

          const { data: messageRows } = await supabase
            .from("chat_messages")
            .select("ui_message_id, role, parts, created_at")
            .eq("session_id", current.id)
            .order("created_at", { ascending: true });

          if (cancelled) return;

          const uiMessages = (messageRows ?? []).map((row: unknown) => {
            const record = row as Record<string, unknown>;
            return {
              id: String(record.ui_message_id),
              role: record.role as UIMessage["role"],
              parts: coerceParts(record.parts),
            };
          }) as UIMessage[];

          savedMessageIdsRef.current = new Set(uiMessages.map((m) => m.id));
          setMessages(uiMessages);
        } else if (loadedExperts.length > 0) {
          const expertId = loadedExperts[0].id;
          const { data: newSession } = await supabase
            .from("chat_sessions")
            .insert({ expert_id: expertId, title: "New chat" })
            .select(
              "id, expert_id, title, last_message, created_at, updated_at"
            )
            .single();

          if (cancelled) return;

          if (newSession) {
            const session = newSession as unknown as SessionRow;
            setSessions([session]);
            setActiveSessionId(session.id);
            setActiveExpertId(session.expert_id);
            savedMessageIdsRef.current = new Set();
            setMessages([]);
          }
        }
      } catch (error) {
        if (cancelled) return;
        setIsLoadingExperts(false);
        setIsLoadingSessions(false);
        console.error("Failed to load Supabase data", error);
      }
    };

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [setMessages, supabase]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (messages.length === 0) return;

    const savedIds = savedMessageIdsRef.current;
    const newMessages = messages.filter((m) => !savedIds.has(m.id));
    const lastAssistant =
      [...messages].reverse().find((m) => m.role === "assistant") ?? null;
    const assistantNeedsUpdate =
      lastAssistant && savedIds.has(lastAssistant.id) ? lastAssistant : null;

    const toUpsert = [
      ...newMessages,
      ...(assistantNeedsUpdate &&
      !newMessages.some((m) => m.id === assistantNeedsUpdate.id)
        ? [assistantNeedsUpdate]
        : []),
    ];

    if (toUpsert.length === 0) return;

    newMessages.forEach((m) => savedIds.add(m.id));

    const abort = new AbortController();
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/messages/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: abort.signal,
            body: JSON.stringify({
              sessionId: activeSessionId,
              messages: toUpsert,
            }),
          });

          if (!response.ok) {
            console.error(
              "Failed to persist chat messages",
              await response.text()
            );
          }
        } catch (error) {
          if ((error as { name?: string }).name === "AbortError") return;
          console.error("Failed to persist chat messages", error);
        }
      })();
    }, 250);

    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [activeSessionId, messages]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status !== "ready") return;
    if (!activeSessionId || !activeExpertId) return;

    setSessions((prev) => {
      const now = new Date().toISOString();
      return prev
        .map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                title:
                  s.title === "New chat" ? trimmed.slice(0, 60) : s.title,
                last_message: trimmed.slice(0, 500),
                updated_at: now,
              }
            : s
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    });

    sendMessage(
      { text: trimmed },
      { body: { sessionId: activeSessionId, expertId: activeExpertId } }
    );
    setInput("");
  };

  return (
    <SidebarProvider
      open={providerOpen}
      onOpenChange={(open) => {
        if (!isMobile) setSidebarOpen(open);
      }}
      className="h-dvh w-full overflow-hidden"
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
              {isLoadingSessions ? (
                <Skeleton className="h-5 w-10 rounded-full bg-muted/60" />
              ) : (
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {sessions.length}
                </Badge>
              )}
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
            {isLoadingSessions
              ? Array.from({ length: 2 }).map((_, index) => (
                  <SidebarMenuItem key={`session-skeleton-${index}`}>
                    <div className="flex min-h-[68px] items-center gap-3 rounded-2xl bg-white/40 px-3 py-3.5 pr-11">
                      <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-28 rounded-md bg-muted/60" />
                          <Skeleton className="ml-auto h-3 w-20 rounded-md bg-muted/60" />
                        </div>
                        <Skeleton className="h-3 w-[85%] rounded-md bg-muted/50" />
                      </div>
                    </div>
                  </SidebarMenuItem>
                ))
              : sessions.map((item, index) => {
                  const isDeleting = deletingSessionIds.has(item.id);
                  const isRemoving = removingSessionIds.has(item.id);
                  return (
              <SidebarMenuItem
                key={item.id}
                className={cn(
                  "group relative transition-[opacity,transform] duration-200",
                  isDeleting && "opacity-60",
                  isRemoving && "pointer-events-none opacity-0 translate-x-2"
                )}
              >
                <SidebarMenuButton
                  isActive={item.id === activeSessionId}
                  tooltip={item.title}
                  className={cn(
                    "rounded-2xl py-3.5 px-3 min-h-[68px] pr-11",
                    "group-data-[collapsible=icon]:min-h-[52px] group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
                    item.id === activeSessionId
                      ? "bg-white shadow-[0_18px_40px_-28px_rgba(32,24,70,0.6)]"
                      : "hover:bg-white/70"
                  )}
                  onClick={async () => {
                    setActiveSessionId(item.id);
                    setActiveExpertId(item.expert_id);

                    const { data: messageRows } = await supabase
                      .from("chat_messages")
                      .select("ui_message_id, role, parts, created_at")
                      .eq("session_id", item.id)
                      .order("created_at", { ascending: true });

                    const uiMessages = (messageRows ?? []).map((row: unknown) => {
                      const record = row as Record<string, unknown>;
                      return {
                        id: String(record.ui_message_id),
                        role: record.role as UIMessage["role"],
                        parts: coerceParts(record.parts),
                      };
                    }) as UIMessage[];

                    savedMessageIdsRef.current = new Set(uiMessages.map((m) => m.id));
                    setMessages(uiMessages);
                    setInput("");
                  }}
                >
                  <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
                    <AvatarFallback className="bg-[var(--user-bubble)] text-[10px] font-semibold group-data-[collapsible=icon]:text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {item.title}
                      </span>
                      <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                        {formatRelativeTime(item.updated_at, nowMs)}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.last_message ?? "—"}
                    </p>
                  </div>
                </SidebarMenuButton>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Delete session"
                  disabled={isDeleting}
                  className={cn(
                    "absolute right-3 top-3.5 h-7 w-7 rounded-full text-muted-foreground opacity-0 transition",
                    "hover:bg-red-500/10 hover:text-red-600",
                    item.id === activeSessionId && "opacity-100",
                    "group-hover:opacity-100"
                  )}
                  onClick={async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (deletingSessionIds.has(item.id)) return;

                    setDeletingSessionIds((prev) => new Set(prev).add(item.id));

                    const response = await fetch("/api/sessions/delete", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ sessionId: item.id }),
                    });

                    if (!response.ok) {
                      console.error(
                        "Failed to delete session",
                        await response.text()
                      );
                      setDeletingSessionIds((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                      return;
                    }

                    const remaining = sessions.filter((s) => s.id !== item.id);

                    setRemovingSessionIds((prev) => new Set(prev).add(item.id));
                    setTimeout(() => {
                      setSessions((prev) => prev.filter((s) => s.id !== item.id));
                      setDeletingSessionIds((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                      setRemovingSessionIds((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }, 180);

                    if (activeSessionId !== item.id) return;

                    const next = remaining[0] ?? null;
                    if (!next) {
                      setActiveSessionId(null);
                      savedMessageIdsRef.current = new Set();
                      setMessages([]);
                      setInput("");
                      return;
                    }

                    setActiveSessionId(next.id);
                    setActiveExpertId(next.expert_id);

                    const { data: messageRows } = await supabase
                      .from("chat_messages")
                      .select("ui_message_id, role, parts, created_at")
                      .eq("session_id", next.id)
                      .order("created_at", { ascending: true });

                    const uiMessages = (messageRows ?? []).map((row: unknown) => {
                      const record = row as Record<string, unknown>;
                      return {
                        id: String(record.ui_message_id),
                        role: record.role as UIMessage["role"],
                        parts: coerceParts(record.parts),
                      };
                    }) as UIMessage[];

                    savedMessageIdsRef.current = new Set(uiMessages.map((m) => m.id));
                    setMessages(uiMessages);
                    setInput("");
                  }}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </SidebarMenuItem>
                  );
                })}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

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
                          onClick={async () => {
                            setActiveExpertId(preset.id);
                            const { data: newSession } = await supabase
                              .from("chat_sessions")
                              .insert({ expert_id: preset.id, title: "New chat" })
                              .select(
                                "id, expert_id, title, last_message, created_at, updated_at"
                              )
                              .single();

                            if (newSession) {
                              const session = newSession as unknown as SessionRow;
                              setSessions((prev) => [session, ...prev]);
                              setActiveSessionId(session.id);
                              savedMessageIdsRef.current = new Set();
                              setMessages([]);
                              setInput("");
                            }
                          }}
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
  const isUser = message.role === "user";
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
            "bg-[linear-gradient(135deg,var(--bot-gradient-start),var(--bot-gradient-end))] text-white shadow-[0_12px_30px_-20px_rgba(78,69,190,0.65)]",
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
                    isUser
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
