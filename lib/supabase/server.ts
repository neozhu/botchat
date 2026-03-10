import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function createSupabaseServerClient() {
  const url = requireEnv("PUBLIC_SUPABASE_URL");
  const publishableKey = requireEnv("PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
