import "server-only";

import { cache } from "react";
import type { BotchatBootstrapData } from "@/lib/botchat/types";
import {
  loadExperts,
  loadMessagesForSession,
  loadSessions,
} from "@/lib/botchat/server-data";

export const getBotchatBootstrapData = cache(async (): Promise<BotchatBootstrapData> => {
  const [experts, sessions] = await Promise.all([loadExperts(), loadSessions()]);

  if (sessions.length === 0) {
    return {
      experts,
      sessions,
      activeExpertId: experts[0]?.id ?? null,
      activeSessionId: null,
      messages: [],
      messageTimestamps: {},
    };
  }

  const activeSession = sessions[0];
  const { messages, messageTimestamps } = await loadMessagesForSession(activeSession.id);

  return {
    experts,
    sessions,
    activeExpertId: activeSession.expert_id,
    activeSessionId: activeSession.id,
    messages,
    messageTimestamps,
  };
});
