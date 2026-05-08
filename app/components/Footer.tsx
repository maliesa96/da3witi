"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/navigation";
import Image from "next/image";
import { isVendorMode, SITE_NAME, LOGO_URL } from "@/lib/vendorClient";

export function Footer() {
  const t = useTranslations('Footer');
  const locale = useLocale();
  const currentYear = new Date().getFullYear();

  if (isVendorMode) {
    return (
      <footer className="border-t border-stone-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 text-center text-xs text-stone-400">
          <span>&copy; {currentYear} {SITE_NAME || "Da3witi"}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-stone-200 bg-white py-8 mt-auto">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="h-8">
            {LOGO_URL ? (
              <Image
                src={LOGO_URL}
                alt={SITE_NAME || "Da3witi"}
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            ) : (
              <Image
                src={locale === 'ar' ? '/images/logo_ar_black.svg' : '/images/logo_en_black.svg'}
                alt="Da3witi"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            )}
          </div>
          <div className="flex gap-6 text-sm text-stone-500 font-medium">
            <Link
              href="/#about"
              locale={locale}
              className="hover:text-stone-900 cursor-pointer"
            >
              {t('about')}
            </Link>
            <Link
              href="/#pricing"
              locale={locale}
              className="hover:text-stone-900 cursor-pointer"
            >
              {t('pricing')}
            </Link>
            <Link
              href="/contact"
              locale={locale}
              className="hover:text-stone-900 cursor-pointer"
            >
              {t('contact')}
            </Link>
          </div>
        </div>
        
        <div className="border-t border-stone-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-400">
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-2 gap-y-1 text-center md:text-start">
            <span>{t('copyright', { year: currentYear })}</span>
            <span className="hidden md:inline text-stone-200">•</span>
            <span>{t('address')}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/da3witi"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-600 transition-colors"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </a>
            <Link
              href="/terms"
              locale={locale}
              className="hover:text-stone-600 transition-colors"
            >
              {t('terms')}
            </Link>
            <Link
              href="/privacy"
              locale={locale}
              className="hover:text-stone-600 transition-colors"
            >
              {t('privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
