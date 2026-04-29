type SupabaseEnvSource = Partial<
  Record<
    | "PUBLIC_SUPABASE_URL"
    | "PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
    | "SUPABASE_SERVICE_ROLE_KEY",
    string | undefined
  >
>;

function requireEnvValue(
  source: SupabaseEnvSource,
  key: keyof SupabaseEnvSource
) {
  const value = source[key]?.trim();
  if (!value) {
    throw new Error(`Missing Supabase env var: ${key}.`);
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

export function getSupabaseServiceRoleEnv(
  source: SupabaseEnvSource = process.env as SupabaseEnvSource
) {
  return {
    ...getSupabaseEnv(source),
    serviceRoleKey: requireEnvValue(source, "SUPABASE_SERVICE_ROLE_KEY"),
  };
}
