"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FileUIPart, UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatPanel } from "@/components/botchat/chat-panel";
import { SessionsPanel } from "@/components/botchat/sessions-panel";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";


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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

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

  const handleSelectSession = async (session: SessionRow) => {
    setActiveSessionId(session.id);
    setActiveExpertId(session.expert_id);

    const { data: messageRows } = await supabase
      .from("chat_messages")
      .select("ui_message_id, role, parts, created_at")
      .eq("session_id", session.id)
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
    setPendingFiles([]);
  };

  const handleDeleteSession = async (session: SessionRow) => {
    if (deletingSessionIds.has(session.id)) return;

    setDeletingSessionIds((prev) => new Set(prev).add(session.id));

    const response = await fetch("/api/sessions/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });

    if (!response.ok) {
      console.error("Failed to delete session", await response.text());
      setDeletingSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
      return;
    }

    const remaining = sessions.filter((s) => s.id !== session.id);

    setRemovingSessionIds((prev) => new Set(prev).add(session.id));
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      setDeletingSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
      setRemovingSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
    }, 180);

    if (activeSessionId !== session.id) return;

    const nextSession = remaining[0] ?? null;
    if (!nextSession) {
      setActiveSessionId(null);
      savedMessageIdsRef.current = new Set();
      setMessages([]);
      setInput("");
      setPendingFiles([]);
      return;
    }

    await handleSelectSession(nextSession);
  };

  const handleCreateSessionForExpert = async (expertId: string) => {
    setActiveExpertId(expertId);

    const { data: newSession } = await supabase
      .from("chat_sessions")
      .insert({ expert_id: expertId, title: "New chat" })
      .select("id, expert_id, title, last_message, created_at, updated_at")
      .single();

    if (!newSession) return;

    const session = newSession as unknown as SessionRow;
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    savedMessageIdsRef.current = new Set();
    setMessages([]);
    setInput("");
    setPendingFiles([]);
  };

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

  const uploadAttachments = async (sessionId: string, files: File[]) => {
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    files.forEach((file) => formData.append("files", file, file.name));

    const response = await fetch("/api/attachments/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as { files?: FileUIPart[] };
    if (!Array.isArray(payload.files)) {
      throw new Error("Invalid upload response.");
    }

    return payload.files;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    const hasText = trimmed.length > 0;
    const hasFiles = pendingFiles.length > 0;
    if ((!hasText && !hasFiles) || status !== "ready") return;
    if (!activeSessionId || !activeExpertId) return;

    setSessions((prev) => {
      const now = new Date().toISOString();
      const attachmentSummary = hasFiles
        ? pendingFiles.length === 1
          ? `Attachment: ${pendingFiles[0]?.name ?? "file"}`
          : `Attachments: ${pendingFiles[0]?.name ?? "file"} +${
              pendingFiles.length - 1
            }`
        : null;
      const previewText = hasText ? trimmed : attachmentSummary ?? "";
      return prev
        .map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                title:
                  s.title === "New chat"
                    ? previewText.slice(0, 60) || s.title
                    : s.title,
                last_message: previewText.slice(0, 500),
                updated_at: now,
              }
            : s
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    });

    void (async () => {
      try {
        setIsUploadingAttachments(hasFiles);

        const uploadedFiles = hasFiles
          ? await uploadAttachments(activeSessionId, pendingFiles)
          : undefined;

        if (hasText) {
          await sendMessage(
            { text: trimmed, files: uploadedFiles },
            { body: { sessionId: activeSessionId, expertId: activeExpertId } }
          );
        } else if (uploadedFiles) {
          await sendMessage(
            { files: uploadedFiles },
            { body: { sessionId: activeSessionId, expertId: activeExpertId } }
          );
        }

        setInput("");
        setPendingFiles([]);
      } catch (error) {
        console.error("Failed to send message with attachments", error);
      } finally {
        setIsUploadingAttachments(false);
      }
    })();
  };
  return (
    <SidebarProvider
      open={providerOpen}
      onOpenChange={(open) => {
        if (!isMobile) setSidebarOpen(open);
      }}
      className="h-dvh w-full overflow-hidden"
    >
      <SessionsPanel
        isLoadingSessions={isLoadingSessions}
        sessions={sessions}
        activeSessionId={activeSessionId}
        deletingSessionIds={deletingSessionIds}
        removingSessionIds={removingSessionIds}
        nowMs={nowMs}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        formatRelativeTime={formatRelativeTime}
      />
      <ChatPanel
        botName={botName}
        botInitials={botInitials}
        suggestionText={suggestionText}
        activeExpert={activeExpert}
        activeExpertId={activeExpertId}
        activeSession={activeSession}
        experts={experts}
        isLoadingExperts={isLoadingExperts}
        messages={messages}
        status={status}
        input={input}
        setInput={setInput}
        onSubmit={onSubmit}
        onCreateSessionForExpert={handleCreateSessionForExpert}
        pendingFiles={pendingFiles}
        setPendingFiles={setPendingFiles}
        isUploadingAttachments={isUploadingAttachments}
      />
    </SidebarProvider>
  );
}
