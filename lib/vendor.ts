import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const VENDOR_ID = process.env.VENDOR_ID || null;
export const isVendorMode = !!VENDOR_ID;

export type CustomerPermissions = {
  canSendInvites: boolean;
};

export const DEFAULT_CUSTOMER_PERMISSIONS: CustomerPermissions = {
  canSendInvites: false,
};

export function parseCustomerPermissions(raw: unknown): CustomerPermissions {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      canSendInvites: typeof obj.canSendInvites === "boolean" ? obj.canSendInvites : DEFAULT_CUSTOMER_PERMISSIONS.canSendInvites,
    };
  }
  return { ...DEFAULT_CUSTOMER_PERMISSIONS };
}

/**
 * Fetch the current vendor record from DB (cached per request via React `cache`).
 * Returns null if not in vendor mode or vendor not found.
 */
export const getVendor = cache(async () => {
  if (!VENDOR_ID) return null;
  return prisma.vendor.findUnique({ where: { id: VENDOR_ID } });
});

/**
 * Check if an email belongs to a vendor admin for the current deployment.
 */
export async function isVendorAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email || !isVendorMode) return false;
  const vendor = await getVendor();
  if (!vendor) return false;
  return vendor.adminEmails.includes(email);
}

/**
 * Check if a user is a customer (authenticated, in vendor mode, but not a vendor admin).
 */
export async function isVendorCustomer(email: string | null | undefined): Promise<boolean> {
  if (!email || !isVendorMode) return false;
  return !(await isVendorAdmin(email));
}

/**
 * Branding helpers read from env (available on both server and client via NEXT_PUBLIC_).
 * 
 * Vendor deployments only need to set VENDOR_ID. At startup, next.config.ts
 * fetches the vendor record from the DB and populates:
 * - NEXT_PUBLIC_VENDOR_MODE, NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_LOGO_URL,
 *   NEXT_PUBLIC_FAVICON_URL, NEXT_PUBLIC_DEFAULT_LOCALE, NEXT_PUBLIC_SUPABASE_COOKIE_NAME,
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
 * Admin emails are read from the DB at runtime (no env var needed).
 */
export const VENDOR_SLUG = process.env.NEXT_PUBLIC_VENDOR_SLUG || null;
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || null;
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || null;
export const FAVICON_URL = process.env.NEXT_PUBLIC_FAVICON_URL || null;
export const DEFAULT_LOCALE = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "ar") as "en" | "ar";
