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
 * Authenticate the current user and verify they are a platform super-admin.
 * Vendor deployments have no admin dashboard — all admin APIs are blocked.
 */
export async function requireAdmin() {
  const { isVendorMode } = await import("@/lib/vendor");
  if (isVendorMode) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, response: null };
}
