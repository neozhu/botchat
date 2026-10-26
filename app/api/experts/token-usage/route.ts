import { getCurrentUser } from "@/lib/auth/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const totals = new Map<string, number>();
    let lastId: string | null = null;

    while (true) {
      let query = supabase.from("chat_sessions")
        .select("id, expert_id, total_tokens")
        .eq("user_id", user.id)
        .order("id", { ascending: true })
        .limit(500);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;

      for (const session of data) {
        totals.set(session.expert_id, (totals.get(session.expert_id) ?? 0) + session.total_tokens);
      }
      lastId = data[data.length - 1].id;
    }

    return Response.json({ usage: Array.from(totals, ([expert_id, total_tokens]) => ({ expert_id, total_tokens })) });
  } catch (error) {
    console.error("Failed to load expert token usage", error);
    return Response.json({ error: "Failed to load token usage." }, { status: 500 });
  }
}
