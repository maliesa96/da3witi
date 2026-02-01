"use client";

import { MailOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/navigation";

export function Footer() {
  const t = useTranslations('Footer');
  const locale = useLocale();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-white py-8 mt-auto">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white">
              <MailOpen size={18} />
            </div>
            <span className="text-lg font-display font-semibold tracking-tight text-stone-900">
              Da3witi
            </span>
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
              href="/#contact"
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
        </div>
      </div>
    </footer>
  );
}
