import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { Pool } from 'pg';

const isVendor = !!process.env.VENDOR_ID;

async function bootstrapVendorEnv() {
  if (!isVendor) return;

  const vendorId = process.env.VENDOR_ID!;
  process.env.NEXT_PUBLIC_VENDOR_MODE = "1";
  process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME = `sb-vendor-${vendorId.slice(0, 8)}-auth-token`;

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) return;

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    const { rows } = await pool.query(
      'SELECT slug, default_locale, name, logo_url, favicon_url, whatsapp_phone_number_id, waba_id, whatsapp_verify_token, support_whatsapp FROM vendors WHERE id = $1 LIMIT 1',
      [vendorId]
    );
    const vendor = rows[0];
    if (!vendor) return;

    if (vendor.slug && !process.env.NEXT_PUBLIC_VENDOR_SLUG) {
      process.env.NEXT_PUBLIC_VENDOR_SLUG = vendor.slug;
    }
    if (vendor.default_locale) {
      process.env.NEXT_PUBLIC_DEFAULT_LOCALE = vendor.default_locale;
    }
    if (vendor.name && !process.env.NEXT_PUBLIC_SITE_NAME) {
      process.env.NEXT_PUBLIC_SITE_NAME = vendor.name;
    }
    if (vendor.logo_url && !process.env.NEXT_PUBLIC_LOGO_URL) {
      process.env.NEXT_PUBLIC_LOGO_URL = vendor.logo_url;
    }
    if (vendor.favicon_url && !process.env.NEXT_PUBLIC_FAVICON_URL) {
      process.env.NEXT_PUBLIC_FAVICON_URL = vendor.favicon_url;
    }
    if (vendor.whatsapp_phone_number_id && !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      process.env.WHATSAPP_PHONE_NUMBER_ID = vendor.whatsapp_phone_number_id;
    }
    if (vendor.waba_id && !process.env.WABA_ID) {
      process.env.WABA_ID = vendor.waba_id;
    }
    if (vendor.whatsapp_verify_token && !process.env.WHATSAPP_VERIFY_TOKEN) {
      process.env.WHATSAPP_VERIFY_TOKEN = vendor.whatsapp_verify_token;
    }
    if (vendor.support_whatsapp && !process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP) {
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP = vendor.support_whatsapp;
    }
  } catch (err) {
    console.warn('[vendor-bootstrap] Failed to fetch vendor config from DB:', err);
  } finally {
    await pool.end();
  }
}

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  distDir: isVendor ? '.next-vendor' : '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default async function config() {
  await bootstrapVendorEnv();
  return withNextIntl(nextConfig);
}
