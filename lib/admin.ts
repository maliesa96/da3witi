import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const ADMIN_EMAILS = ["mashari7@yahoo.com"];

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

/**
 * Authenticate the current user and verify they are an admin.
 * Returns the Supabase user on success, or a 403 NextResponse on failure.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, response: null };
}
