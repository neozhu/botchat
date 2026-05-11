import "server-only";

import type { UIMessage } from "ai";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expertSeeds } from "@/lib/botchat/expert-seeds";
import { shouldSeedExperts } from "@/lib/botchat/expert-seeding";
import { buildSessionInsertPayload } from "@/lib/botchat/session-payload";
import type { ExpertRow, SessionRow } from "@/lib/botchat/types";

export const BOTCHAT_EXPERTS_TAG = "botchat-experts";

const SESSION_SELECT =
  "id, expert_id, title, last_message, total_tokens, context_summary, created_at, updated_at";

type MessageRow = {
  ui_message_id: string;
  role: UIMessage["role"];
  parts: UIMessage["parts"];
  total_tokens: number | null;
  created_at: string;
};

export type SessionMessagesPayload = {
  messages: UIMessage[];
  messageTimestamps: Record<string, string>;
};

export type SaveExpertInput = {
  id?: string;
  slug: string;
  name: string;
  agent_name: string;
  description: string | null;
  system_prompt: string;
  suggestion_question: string | null;
  sort_order: number;
};

function coerceParts(value: unknown) {
  return Array.isArray(value) ? (value as UIMessage["parts"]) : [];
}

function toUiMessages(rows: MessageRow[]) {
  return rows.map((row) => ({
    id: row.ui_message_id,
    role: row.role,
    parts: coerceParts(row.parts),
    metadata:
      row.total_tokens && row.total_tokens > 0
        ? { totalTokens: row.total_tokens }
        : undefined,
  })) as UIMessage[];
}

function toTimestampMap(rows: MessageRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    if (row.created_at) acc[row.ui_message_id] = row.created_at;
    return acc;
  }, {});
}

export async function loadExpertsFresh() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("experts")
    .select(
      "id, slug, name, agent_name, description, system_prompt, suggestion_question, sort_order, created_at"
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ExpertRow[];
}

const ensureExpertSeeds = cache(async () => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("experts").select("slug");

  if (error) throw new Error(error.message);

  const existingSlugs = (data ?? [])
    .map((row) => row.slug)
    .filter((slug): slug is string => typeof slug === "string");

  if (
    !shouldSeedExperts(
      Boolean(user),
      existingSlugs,
      expertSeeds.map((seed) => seed.slug)
    )
  ) {
    return false;
  }

  const existingSlugSet = new Set(existingSlugs);
  const missingSeeds = expertSeeds.filter((seed) => !existingSlugSet.has(seed.slug));

  if (missingSeeds.length === 0) return false;

  const { error: upsertError } = await supabase.from("experts").upsert(missingSeeds, {
    onConflict: "slug",
  });

  if (upsertError) throw new Error(upsertError.message);
  return true;
});

export const loadExperts = cache(async () => {
  await ensureExpertSeeds();
  return loadExpertsFresh();
});

export const loadSessions = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select(SESSION_SELECT)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as SessionRow[];
});

export async function searchSessions(query: string, limit = 100) {
  const normalized = query.trim();
  if (!normalized) return [] as SessionRow[];

  const supabase = await createSupabaseServerClient();
  const like = `%${normalized}%`;

  const { data, error } = await supabase
    .from("chat_sessions")
    .select(SESSION_SELECT)
    .or(`title.ilike.${like},last_message.ilike.${like},context_summary.ilike.${like}`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as SessionRow[];
}

export const loadMessagesForSession = cache(async (sessionId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("ui_message_id, role, parts, total_tokens, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MessageRow[];
  return {
    messages: toUiMessages(rows),
    messageTimestamps: toTimestampMap(rows),
  } satisfies SessionMessagesPayload;
});

export async function createSessionForExpert(userId: string, expertId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert(buildSessionInsertPayload(userId, expertId))
    .select(SESSION_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as SessionRow;
}

export async function saveExpert(input: SaveExpertInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    slug: input.slug,
    name: input.name,
    agent_name: input.agent_name,
    description: input.description,
    system_prompt: input.system_prompt,
    suggestion_question: input.suggestion_question,
    sort_order: input.sort_order,
  };

  if (input.id) {
    const { error } = await supabase.from("experts").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("experts")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: String(data.id) };
}

export async function deleteExpertById(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data: linkedSessions, error: linkedSessionsError } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("expert_id", id);

  if (linkedSessionsError) throw new Error(linkedSessionsError.message);

  const deletedSessionIds = (linkedSessions ?? [])
    .map((session) => session.id)
    .filter((sessionId): sessionId is string => typeof sessionId === "string");

  if (deletedSessionIds.length > 0) {
    const { error: deleteMessagesError } = await supabase
      .from("chat_messages")
      .delete()
      .in("session_id", deletedSessionIds);

    if (deleteMessagesError) throw new Error(deleteMessagesError.message);

    const { error: deleteSessionsError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("expert_id", id);

    if (deleteSessionsError) throw new Error(deleteSessionsError.message);
  }

  const { error } = await supabase.from("experts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { deletedSessionIds };
}

export async function persistExpertOrder(
  items: Array<{ id: string; sort_order: number }>
) {
  const supabase = await createSupabaseServerClient();

  const results = await Promise.all(
    items.map((item) =>
      supabase.from("experts").update({ sort_order: item.sort_order }).eq("id", item.id)
    )
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);
}
