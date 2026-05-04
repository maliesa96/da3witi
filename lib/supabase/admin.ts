import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with admin (service role) privileges.
 * Only use server-side for operations that require elevated access
 * (e.g. inviting users, generating auth links).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
