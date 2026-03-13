import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

type CreateSupabasePublicServerClientOptions = {
  env?: Partial<
    Record<
      "PUBLIC_SUPABASE_URL" | "PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      string | undefined
    >
  >;
};

export function createSupabasePublicServerClient<
  TClient = SupabaseClient
>(
  options: CreateSupabasePublicServerClientOptions & {
    createClientImpl?: (url: string, key: string) => TClient;
  } = {}
) {
  const { url, publishableKey } = getSupabaseEnv(options.env);
  const createClientImpl = options.createClientImpl ?? createClient;

  return createClientImpl(url, publishableKey);
}
