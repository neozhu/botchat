import type { UIMessage } from "ai";

export type ExpertRow = {
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

export type SessionRow = {
  id: string;
  expert_id: string;
  title: string;
  last_message: string | null;
  total_tokens: number;
  context_summary?: string | null;
  created_at: string;
  updated_at: string;
};

export type BotchatBootstrapData = {
  experts: ExpertRow[];
  sessions: SessionRow[];
  activeExpertId: string | null;
  activeSessionId: string | null;
  messages: UIMessage[];
  messageTimestamps: Record<string, string>;
};
