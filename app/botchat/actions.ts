"use server";

import { revalidateTag } from "next/cache";
import { generateText, Output, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { getOpenAIModelId } from "@/lib/ai/openai";
import { getDuplicateExpertNameError } from "@/lib/botchat/expert-settings";
import { buildExpertGenerationPrompt } from "@/lib/botchat/expert-generation-prompt";
import {
  BOTCHAT_EXPERTS_TAG,
  createSessionForExpert,
  deleteExpertById,
  loadExperts,
  loadExpertsFresh,
  loadMessagesForSession,
  persistExpertOrder,
  saveExpert,
  searchSessions,
} from "@/lib/botchat/server-data";
import { syncSessionMessages } from "@/lib/botchat/message-sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExpertRow, SessionRow } from "@/lib/botchat/types";

type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function searchSessionsAction(
  query: string
): Promise<ActionResult<{ sessions: SessionRow[] }>> {
  try {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return { ok: true, sessions: [] };
    return { ok: true, sessions: await searchSessions(normalizedQuery) };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Failed to search sessions.") };
  }
}

export async function loadSessionMessagesAction(sessionId: string) {
  try {
    if (!sessionId.trim()) throw new Error("Missing sessionId.");
    const payload = await loadMessagesForSession(sessionId);
    return { ok: true, ...payload } as const;
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, "Failed to load session messages."),
    } as const;
  }
}

export async function createSessionAction(
  expertId: string
): Promise<ActionResult<{ session: SessionRow }>> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    const normalizedExpertId = expertId.trim();
    if (!normalizedExpertId) throw new Error("Missing expertId.");
    const session = await createSessionForExpert(user.id, normalizedExpertId);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Failed to create session.") };
  }
}

export async function deleteSessionAction(
  sessionId: string
): Promise<ActionResult<object>> {
  try {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) throw new Error("Missing sessionId.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", normalizedSessionId);

    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Failed to delete session.") };
  }
}

export async function syncMessagesAction({
  sessionId,
  messages,
}: {
  sessionId: string;
  messages: UIMessage[];
}) {
  try {
    const session = await syncSessionMessages({ sessionId, messages });
    return { ok: true, session } as const;
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, "Failed to persist messages."),
    } as const;
  }
}

export async function loadExpertsAction(): Promise<
  ActionResult<{ experts: ExpertRow[] }>
> {
  try {
    return { ok: true, experts: await loadExperts() };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Failed to load experts.") };
  }
}

export async function reorderExpertsAction(
  items: Array<{ id: string; sort_order: number }>
): Promise<ActionResult<{ experts: ExpertRow[] }>> {
  try {
    if (
      !Array.isArray(items) ||
      items.some(
        (item) =>
          !isRecord(item) ||
          typeof item.id !== "string" ||
          typeof item.sort_order !== "number"
      )
    ) {
      throw new Error("Invalid reorder payload.");
    }

    await persistExpertOrder(items);
    revalidateTag(BOTCHAT_EXPERTS_TAG, "max");
    return { ok: true, experts: await loadExperts() };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Failed to reorder experts.") };
  }
}

export async function saveExpertAction(
  body: Partial<ExpertRow>
): Promise<ActionResult<{ experts: ExpertRow[] }>> {
  try {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const agentName =
      typeof body.agent_name === "string" ? body.agent_name.trim() : "";
    const systemPrompt =
      typeof body.system_prompt === "string" ? body.system_prompt.trim() : "";
    if (!name || !agentName || !systemPrompt) {
      throw new Error("Name / Agent name / System prompt are required.");
    }

    const existingExperts = await loadExpertsFresh();
    const duplicateNameError = getDuplicateExpertNameError(existingExperts, {
      id: typeof body.id === "string" ? body.id : undefined,
      name,
    });
    if (duplicateNameError) throw new Error(duplicateNameError);

    await saveExpert({
      id: typeof body.id === "string" ? body.id : undefined,
      slug: typeof body.slug === "string" ? body.slug.trim() : "",
      name,
      agent_name: agentName,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      system_prompt: systemPrompt,
      suggestion_question:
        typeof body.suggestion_question === "string" &&
        body.suggestion_question.trim()
          ? body.suggestion_question.trim()
          : null,
      sort_order:
        typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
          ? body.sort_order
          : 0,
    });

    revalidateTag(BOTCHAT_EXPERTS_TAG, "max");
    return { ok: true, experts: await loadExpertsFresh() };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Failed to save expert.") };
  }
}

export async function deleteExpertAction(
  id: string
): Promise<ActionResult<{ experts: ExpertRow[]; deletedSessionIds: string[] }>> {
  try {
    const normalizedId = id.trim();
    if (!normalizedId) throw new Error("Missing expert id.");

    const { deletedSessionIds } = await deleteExpertById(normalizedId);
    revalidateTag(BOTCHAT_EXPERTS_TAG, "max");
    const experts = await loadExperts();
    return { ok: true, experts, deletedSessionIds };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Failed to delete expert.") };
  }
}

const expertGenerationSchema = z.object({
  system_prompt: z.string().min(1),
  suggestion_question: z.string().min(1),
});

export async function generateExpertPromptAction({
  name,
  agent_name: agentName,
  description,
  languageHint,
}: {
  name: string;
  agent_name?: string;
  description?: string | null;
  languageHint?: string;
}) {
  try {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("Missing expert name.");

    const prompt = buildExpertGenerationPrompt({
      name: normalizedName,
      agentName: agentName?.trim() ?? "",
      description: description?.trim() ?? "",
      languageHint: languageHint?.trim() ?? "",
    });

    const { output } = await generateText({
      model: openai(getOpenAIModelId()),
      prompt,
      output: Output.object({ schema: expertGenerationSchema }),
    });

    return { ok: true, ...output } as const;
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, "Failed to generate with AI."),
    } as const;
  }
}
