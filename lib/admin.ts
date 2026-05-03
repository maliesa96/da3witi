import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/admin-emails";

export { ADMIN_EMAILS };

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

/**
 * Check if a user has admin access in the current deployment context.
 * - On the primary site: super-admin (ADMIN_EMAILS)
 * - On a vendor site: vendor admin (vendor.adminEmails) OR platform super-admin
 *
 * Session isolation via per-site cookies ensures a platform admin must log in
 * explicitly on the vendor site to have a session there.
 * Lazy-imports lib/vendor to avoid pulling Prisma into Edge middleware.
 */
export async function hasAdminAccess(email: string | null | undefined): Promise<boolean> {
  if (isAdmin(email)) return true;
  const { isVendorMode, isVendorAdmin } = await import("@/lib/vendor");
  if (isVendorMode) return isVendorAdmin(email);
  return false;
}

/**
 * Authenticate the current user and verify they are an admin.
 * In vendor mode only vendor admins are accepted; on the primary site
 * only platform super-admins (ADMIN_EMAILS) are accepted.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = user ? await hasAdminAccess(user.email) : false;

  if (!user || !allowed) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, response: null };
}
