"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FileUIPart, UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  createSessionAction,
  deleteSessionAction,
  loadSessionMessagesAction,
  syncMessagesAction,
} from "@/app/botchat/actions";
import { ChatPanel } from "@/components/botchat/chat-panel";
import { SessionsPanel } from "@/components/botchat/sessions-panel";
import { getReasoningEffortFromToggle } from "@/lib/ai/reasoning-effort";
import { getOptimisticSessionTitle } from "@/lib/botchat/session-title";
import type {
  BotchatBootstrapData,
  ExpertRow,
  SessionRow,
} from "@/lib/botchat/types";
import { SidebarProvider } from "@/components/ui/sidebar";

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

type BotchatDashboardProps = {
  initialData: BotchatBootstrapData;
};

type SyncedSessionUpdate = {
  id?: string;
  title?: string;
  last_message?: string | null;
  updated_at?: string;
};

export default function BotchatDashboardClient({
  initialData,
}: BotchatDashboardProps) {
  const initialSessionIdRef = useRef(initialData.activeSessionId);
  const initialMessagesRef = useRef(initialData.messages);
  const savedMessageIdsRef = useRef<Set<string>>(
    new Set(initialData.messages.map((message) => message.id))
  );
  const messagesSessionIdRef = useRef<string | null>(initialData.activeSessionId);
  const generationSessionIdRef = useRef<string | null>(null);
  const inFlightAbortRef = useRef<AbortController | null>(null);
  const sessionLoadTokenRef = useRef(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [deletingSessionIds, setDeletingSessionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [removingSessionIds, setRemovingSessionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isHighReasoning, setIsHighReasoning] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [messageTimestamps, setMessageTimestamps] = useState<
    Record<string, string>
  >(() => initialData.messageTimestamps);

  const [experts, setExperts] = useState<ExpertRow[]>(() => initialData.experts);
  const [sessions, setSessions] = useState<SessionRow[]>(() => initialData.sessions);
  const [activeExpertId, setActiveExpertId] = useState<string | null>(
    () => initialData.activeExpertId
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => initialData.activeSessionId
  );
  const chatBootstrapMessages =
    activeSessionId && activeSessionId === initialSessionIdRef.current
      ? initialMessagesRef.current
      : [];

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: activeSessionId ?? "new",
    messages: chatBootstrapMessages,
    transport: new DefaultChatTransport({ api: "/chat/stream" }),
    onFinish: ({ message }) => {
      const targetSessionId =
        generationSessionIdRef.current ?? activeSessionId ?? null;
      if (!targetSessionId) return;
      const text = messageText(message).trim();
      if (!text) return;

      const now = new Date().toISOString();
      setSessions((prev) =>
        prev
          .map((s) =>
            s.id === targetSessionId
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeExpert = useMemo(
    () => experts.find((expert) => expert.id === activeExpertId) ?? null,
    [experts, activeExpertId]
  );

  const botName = activeExpert?.agent_name ?? "Kate";
  const botInitials = initialsFromName(botName);
  const suggestionText =
    activeExpert?.suggestion_question ?? "What should the assistant ask next?";
  const isLoadingExperts = false;
  const isLoadingSessions = false;

  const handleSelectSession = async (session: SessionRow) => {
    const token = ++sessionLoadTokenRef.current;

    try {
      inFlightAbortRef.current?.abort();
      inFlightAbortRef.current = null;
      setIsUploadingAttachments(false);
      if (status !== "ready") await stop();
    } catch {
      // Best-effort abort; switching sessions should still work.
    }

    if (token !== sessionLoadTokenRef.current) return;

    messagesSessionIdRef.current = null;
    savedMessageIdsRef.current = new Set();
    setMessages([]);
    setMessageTimestamps({});
    setPendingFiles([]);
    setInput("");

    setActiveSessionId(session.id);
    setActiveExpertId(session.expert_id);

    const payload = await loadSessionMessagesAction(session.id);
    if (!payload.ok) {
      console.error("Failed to load session messages", payload.error);
      return;
    }

    const uiMessages = Array.isArray(payload.messages) ? payload.messages : [];
    const loadedTimestamps =
      payload.messageTimestamps &&
      typeof payload.messageTimestamps === "object" &&
      !Array.isArray(payload.messageTimestamps)
        ? payload.messageTimestamps
        : {};

    if (token !== sessionLoadTokenRef.current) return;

    messagesSessionIdRef.current = session.id;
    savedMessageIdsRef.current = new Set(uiMessages.map((m) => m.id));
    setMessageTimestamps(loadedTimestamps);
    setMessages(uiMessages);
  };

  const handleDeleteSession = async (session: SessionRow) => {
    try {
      inFlightAbortRef.current?.abort();
      inFlightAbortRef.current = null;
      setIsUploadingAttachments(false);
      if (status !== "ready") await stop();
    } catch {
      // Best-effort abort; continue deletion.
    }

    if (deletingSessionIds.has(session.id)) return;

    setDeletingSessionIds((prev) => new Set(prev).add(session.id));

    const deleteResult = await deleteSessionAction(session.id);

    if (!deleteResult.ok) {
      console.error("Failed to delete session", deleteResult.error);
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
      messagesSessionIdRef.current = null;
      savedMessageIdsRef.current = new Set();
      setMessages([]);
      setMessageTimestamps({});
      setInput("");
      setPendingFiles([]);
      return;
    }

    await handleSelectSession(nextSession);
  };

  const handleCreateSessionForExpert = async (expertId: string) => {
    try {
      inFlightAbortRef.current?.abort();
      inFlightAbortRef.current = null;
      setIsUploadingAttachments(false);
      if (status !== "ready") await stop();
    } catch {
      // Best-effort abort; creating a new session should still work.
    }

    setActiveExpertId(expertId);

    const payload = await createSessionAction(expertId);

    if (!payload.ok) {
      console.error("Failed to create session", payload.error);
      return;
    }

    const session = payload.session ?? null;
    if (!session) return;

    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    messagesSessionIdRef.current = session.id;
    savedMessageIdsRef.current = new Set();
    setMessages([]);
    setMessageTimestamps({});
    setInput("");
    setPendingFiles([]);
  };

  const handleCreateSessionFromSidebar = async () => {
    const expertId = activeExpertId ?? experts[0]?.id ?? null;
    if (!expertId) return;
    await handleCreateSessionForExpert(expertId);
  };

  const handleExpertDeleted = async ({
    expertId,
    deletedSessionIds,
    experts: nextExperts,
  }: {
    expertId: string;
    deletedSessionIds: string[];
    experts: ExpertRow[];
  }) => {
    const deletedSessionIdSet = new Set(deletedSessionIds);
    const isActiveSessionDeleted =
      activeSessionId !== null && deletedSessionIdSet.has(activeSessionId);

    if (isActiveSessionDeleted) {
      try {
        inFlightAbortRef.current?.abort();
        inFlightAbortRef.current = null;
        setIsUploadingAttachments(false);
        if (status !== "ready") await stop();
      } catch {
        // Best-effort abort; continue cleanup.
      }
    }

    const remainingSessions = sessions.filter(
      (session) => !deletedSessionIdSet.has(session.id)
    );

    setSessions(remainingSessions);

    if (!isActiveSessionDeleted) {
      if (!activeSessionId && activeExpertId === expertId) {
        setActiveExpertId(nextExperts[0]?.id ?? null);
      }
      return;
    }

    const nextSession = remainingSessions[0] ?? null;

    if (!nextSession) {
      setActiveSessionId(null);
      setActiveExpertId(nextExperts[0]?.id ?? null);
      messagesSessionIdRef.current = null;
      savedMessageIdsRef.current = new Set();
      setMessages([]);
      setMessageTimestamps({});
      setInput("");
      setPendingFiles([]);
      return;
    }

    await handleSelectSession(nextSession);
  };

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (sessions.length > 0 || experts.length === 0 || activeSessionId) return;

    let cancelled = false;

    const createInitialSession = async () => {
      try {
        const expertId = activeExpertId ?? experts[0]?.id ?? null;
        if (!expertId) return;

        const payload = await createSessionAction(expertId);

        if (cancelled || !payload.ok) {
          if (!cancelled && !payload.ok) {
            console.error("Failed to create initial session", payload.error);
          }
          return;
        }

        const session = payload.session ?? null;
        if (!session) return;

        setSessions([session]);
        setActiveSessionId(session.id);
        setActiveExpertId(session.expert_id);
        messagesSessionIdRef.current = session.id;
        savedMessageIdsRef.current = new Set();
        setMessages([]);
        setMessageTimestamps({});
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to create initial session", error);
      }
    };

    void createInitialSession();
    return () => {
      cancelled = true;
    };
  }, [activeExpertId, activeSessionId, experts, sessions.length, setMessages]);

  useEffect(() => {
    if (messages.length === 0) return;

    setMessageTimestamps((prev) => {
      let changed = false;
      const now = new Date().toISOString();
      const next = { ...prev };

      for (const message of messages) {
        if (!next[message.id]) {
          next[message.id] = now;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [messages]);

  useEffect(() => {
    const sessionId = messagesSessionIdRef.current;
    if (!sessionId) return;
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

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const syncPayload = await syncMessagesAction({
            sessionId,
            messages: toUpsert,
          });

          if (!syncPayload.ok) {
            console.error("Failed to persist chat messages", syncPayload.error);
            return;
          }

          const syncedSession = syncPayload.session as SyncedSessionUpdate;
          if (syncedSession?.id === sessionId) {
            setSessions((prev) =>
              prev
                .map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        ...(typeof syncedSession.title === "string"
                          ? { title: syncedSession.title }
                          : {}),
                        ...(typeof syncedSession.last_message === "string"
                          ? { last_message: syncedSession.last_message }
                          : {}),
                        ...(typeof syncedSession.updated_at === "string"
                          ? { updated_at: syncedSession.updated_at }
                          : {}),
                      }
                    : session
                )
                .sort(
                  (a, b) =>
                    new Date(b.updated_at).getTime() -
                    new Date(a.updated_at).getTime()
                )
            );
          }
        } catch (error) {
          console.error("Failed to persist chat messages", error);
        }
      })();
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, [messages]);

  const uploadAttachments = async (
    sessionId: string,
    files: File[],
    signal: AbortSignal
  ) => {
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    files.forEach((file) => formData.append("files", file, file.name));

    const response = await fetch("/api/attachments/upload", {
      method: "POST",
      body: formData,
      signal,
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
    const filesSnapshot = pendingFiles;
    const hasFiles = filesSnapshot.length > 0;
    if ((!hasText && !hasFiles) || status !== "ready") return;
    if (!activeSessionId || !activeExpertId) return;

    const sessionIdAtSend = activeSessionId;
    const expertIdAtSend = activeExpertId;
    const reasoningEffortAtSend = getReasoningEffortFromToggle(isHighReasoning);
    const webSearchAtSend = isWebSearchEnabled;
    const abort = new AbortController();

    setInput("");
    setPendingFiles([]);

    inFlightAbortRef.current?.abort();
    inFlightAbortRef.current = abort;

    void (async () => {
      try {
        setIsUploadingAttachments(hasFiles);
        generationSessionIdRef.current = sessionIdAtSend;
        messagesSessionIdRef.current = sessionIdAtSend;

        const uploadedFiles = hasFiles
          ? await uploadAttachments(sessionIdAtSend, filesSnapshot, abort.signal)
          : undefined;

        if (abort.signal.aborted) return;
        if (activeSessionId !== sessionIdAtSend) return;

        const now = new Date().toISOString();
        const attachmentSummary = hasFiles
          ? filesSnapshot.length === 1
            ? `Attachment: ${filesSnapshot[0]?.name ?? "file"}`
            : `Attachments: ${filesSnapshot[0]?.name ?? "file"} +${
                filesSnapshot.length - 1
              }`
          : null;
        const previewText = hasText ? trimmed : attachmentSummary ?? "";

        setSessions((prev) =>
          prev
            .map((s) =>
              s.id === sessionIdAtSend
                ? {
                    ...s,
                    title: getOptimisticSessionTitle(s.title, previewText),
                    updated_at: now,
                  }
                : s
            )
            .sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            )
        );

        if (hasText) {
          await sendMessage(
            { text: trimmed, files: uploadedFiles },
            {
              body: {
                sessionId: sessionIdAtSend,
                expertId: expertIdAtSend,
                reasoningEffort: reasoningEffortAtSend,
                webSearch: webSearchAtSend,
              },
            }
          );
        } else if (uploadedFiles) {
          await sendMessage(
            { files: uploadedFiles },
            {
              body: {
                sessionId: sessionIdAtSend,
                expertId: expertIdAtSend,
                reasoningEffort: reasoningEffortAtSend,
                webSearch: webSearchAtSend,
              },
            }
          );
        }

      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        console.error("Failed to send message with attachments", error);
      } finally {
        if (inFlightAbortRef.current === abort) inFlightAbortRef.current = null;
        setIsUploadingAttachments(false);
      }
    })();
  };
  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className="h-dvh w-full overflow-hidden"
    >
      <SessionsPanel
        isLoadingSessions={isLoadingSessions}
        experts={experts}
        sessions={sessions}
        activeSessionId={activeSessionId}
        deletingSessionIds={deletingSessionIds}
        removingSessionIds={removingSessionIds}
        nowMs={nowMs}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onCreateSession={handleCreateSessionFromSidebar}
        formatRelativeTime={formatRelativeTime}
        onExpertsUpdated={setExperts}
        onExpertDeleted={handleExpertDeleted}
      />
      <ChatPanel
        botName={botName}
        botInitials={botInitials}
        suggestionText={suggestionText}
        activeExpert={activeExpert}
        activeExpertId={activeExpertId}
        experts={experts}
        isLoadingExperts={isLoadingExperts}
        messages={messages}
        messageTimestamps={messageTimestamps}
        status={status}
        input={input}
        setInput={setInput}
        isHighReasoning={isHighReasoning}
        isWebSearchEnabled={isWebSearchEnabled}
        onToggleReasoning={() => setIsHighReasoning((value) => !value)}
        onToggleWebSearch={() => setIsWebSearchEnabled((value) => !value)}
        onSubmit={onSubmit}
        onCreateSessionForExpert={handleCreateSessionForExpert}
        pendingFiles={pendingFiles}
        setPendingFiles={setPendingFiles}
        isUploadingAttachments={isUploadingAttachments}
      />
    </SidebarProvider>
  );
}
