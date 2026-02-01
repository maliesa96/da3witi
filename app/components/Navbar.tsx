"use client";

import { MailOpen, Globe, Plus, LogOut, User, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { signOut } from "@/app/[locale]/login/actions";

export function Navbar() {
  const t = useTranslations('Navbar');
  const authT = useTranslations('Auth');
  const locale = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Client Components can still be SSR'd; create the browser client only in the browser.
    const supabase = createClient();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    void getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const langLabel = locale === 'ar' ? 'English' : 'العربية';

  // Close mobile menu when clicking outside or on a link
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 border-b border-stone-200/50 bg-[#FDFCF8]">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white shrink-0">
              <MailOpen size={18} />
            </div>
            <span className="text-lg md:text-xl font-display font-semibold tracking-tight text-stone-900 truncate">
              {t('brand')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 md:gap-4">
            <Link
              href={pathname}
              locale={otherLocale}
              className="text-[10px] md:text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Globe size={14} />
              <span className="hidden sm:inline">{langLabel}</span>
              <span className="sm:hidden uppercase">{otherLocale}</span>
            </Link>
            
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900 px-2 md:px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all cursor-pointer"
                >
                  {t('dashboard')}
                </Link>
                <form action={signOut} className="hidden sm:block">
                  <button
                    type="submit"
                    className="text-sm font-medium text-stone-600 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span className="hidden md:inline">{authT('sign_out')}</span>
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all flex items-center gap-2 cursor-pointer"
              >
                <User size={16} />
                <span className="hidden sm:inline">{authT('login')}</span>
              </Link>
            )}

            <Link
              href="/wizard"
              prefetch={false}
              className="bg-stone-900 text-white text-xs md:text-sm font-semibold px-4 md:px-6 py-2.5 rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 group shrink-0 cursor-pointer"
            >
              <span>{user ? t('create_event') : t('start_now')}</span>
              <Plus
                size={16}
                className="transition-transform group-hover:rotate-90 md:block hidden"
              />
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col p-6 space-y-4">
          <Link
            href={pathname}
            locale={otherLocale}
            className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Globe size={18} />
            <span>{langLabel}</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User size={18} />
                <span>{t('dashboard')}</span>
              </Link>
              <form action={signOut} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 px-4 py-3 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogOut size={18} />
                  <span>{authT('sign_out')}</span>
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User size={18} />
              <span>{authT('login')}</span>
            </Link>
          )}

          <div className="pt-4 border-t border-stone-200">
            <Link
              href="/wizard"
              prefetch={false}
              className="w-full bg-stone-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-stone-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Plus size={18} />
              <span>{user ? t('create_event') : t('start_now')}</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
