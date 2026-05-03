/**
 * Client-safe vendor config. Uses only NEXT_PUBLIC_ env vars
 * so it can be imported in client components.
 */

export const isVendorMode = !!process.env.NEXT_PUBLIC_VENDOR_MODE;
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || null;
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || null;
export const FAVICON_URL = process.env.NEXT_PUBLIC_FAVICON_URL || null;
export const DEFAULT_LOCALE = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "ar") as "en" | "ar";
