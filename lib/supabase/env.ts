type SupabaseEnvSource = Partial<
  Record<
    "PUBLIC_SUPABASE_URL" | "PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    string | undefined
  >
>;

function requireEnvValue(
  source: SupabaseEnvSource,
  key: keyof SupabaseEnvSource
) {
  const value = source[key]?.trim();
  if (!value) {
    throw new Error(
      "Missing Supabase env vars: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY must be set."
    );
  }

  return value;
}

export function getSupabaseEnv(
  source: SupabaseEnvSource = process.env as SupabaseEnvSource
) {
  return {
    url: requireEnvValue(source, "PUBLIC_SUPABASE_URL"),
    publishableKey: requireEnvValue(
      source,
      "PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
    ),
  };
}
