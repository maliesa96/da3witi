import {defineRouting} from 'next-intl/routing';

const defaultLocale = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE === 'en' ? 'en' : 'ar') as 'en' | 'ar';
const isVendorMode = process.env.NEXT_PUBLIC_VENDOR_MODE === '1';

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale,
  localeDetection: !isVendorMode,
});
