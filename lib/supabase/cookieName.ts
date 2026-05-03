const VENDOR_ID = process.env.VENDOR_ID || null;

// On the server/edge, derive from VENDOR_ID directly.
// On the browser, read the public env var set by next.config.ts.
export const COOKIE_NAME: string | undefined = VENDOR_ID
  ? `sb-vendor-${VENDOR_ID.slice(0, 8)}-auth-token`
  : process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME || undefined;
