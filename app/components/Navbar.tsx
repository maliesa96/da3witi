"use client";

import { MailOpen, Globe, ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "../../navigation";

export function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const pathname = usePathname();

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const langLabel = locale === 'ar' ? 'English' : 'العربية';

  return (
    <nav className="fixed w-full z-50 top-0 transition-all duration-300 border-b border-stone-200/50 glass-panel">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white">
            <MailOpen size={18} />
          </div>
          <span className="text-xl font-semibold tracking-tight text-stone-900">
            {t('brand')}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href={pathname}
            locale={otherLocale}
            className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1"
          >
            <Globe size={14} />
            <span>{langLabel}</span>
          </Link>
          <Link
            href="/dashboard"
            className="hidden md:flex text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all"
          >
            {t('dashboard')}
          </Link>
          <Link
            href="/wizard"
            className="bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-800 transition-all shadow-sm flex items-center gap-2 group"
          >
            <span>{t('start_now')}</span>
            <ArrowLeft
              size={16}
              className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}
