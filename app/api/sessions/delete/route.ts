import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json();
  const sessionId =
    typeof body?.sessionId === "string" ? (body.sessionId as string) : null;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId." }), {
      status: 400,
    });
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to delete session.", details: error.message }),
      { status: 500 }
    );
  }

  // chat_messages are deleted via FK cascade (chat_messages.session_id -> chat_sessions.id ON DELETE CASCADE)
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

