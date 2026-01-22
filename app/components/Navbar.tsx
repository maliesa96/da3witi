"use client";

import { MailOpen, Globe, ArrowRight, LogOut, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { signOut } from "@/app/[locale]/login/actions";

export function Navbar() {
  const t = useTranslations('Navbar');
  const authT = useTranslations('Auth');
  const locale = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const langLabel = locale === 'ar' ? 'English' : 'العربية';

  return (
    <nav className="fixed w-full z-50 top-0 transition-all duration-300 border-b border-stone-200/50 bg-[#FDFCF8]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white shrink-0">
            <MailOpen size={18} />
          </div>
          <span className="text-lg md:text-xl font-semibold tracking-tight text-stone-900 truncate">
            {t('brand')}
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href={pathname}
            locale={otherLocale}
            className="text-[10px] md:text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1"
          >
            <Globe size={14} />
            <span className="hidden sm:inline">{langLabel}</span>
            <span className="sm:hidden uppercase">{otherLocale}</span>
          </Link>
          
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900 px-2 md:px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all"
              >
                {t('dashboard')}
              </Link>
              <form action={signOut} className="hidden sm:block">
                <button
                  type="submit"
                  className="text-sm font-medium text-stone-600 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  <LogOut size={16} />
                  <span className="hidden md:inline">{authT('sign_out')}</span>
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all flex items-center gap-2"
            >
              <User size={16} />
              <span className="hidden sm:inline">{authT('login')}</span>
            </Link>
          )}

          <Link
            href="/wizard"
            className="bg-stone-900 text-white text-xs md:text-sm font-semibold px-4 md:px-6 py-2.5 rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 group shrink-0"
          >
            <span>{t('start_now')}</span>
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform rtl:-scale-x-100 rtl:group-hover:-translate-x-1 md:block hidden"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}
