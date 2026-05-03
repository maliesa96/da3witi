"use client";

import { Globe, Plus, LogOut, User, Menu, X, Mail, Shield, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { signOut } from "@/app/[locale]/login/actions";
import Image from "next/image";
import { isVendorMode, SITE_NAME, LOGO_URL } from "@/lib/vendorClient";

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

    // Fetch user on mount and whenever pathname changes (e.g., after login redirect)
    void getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [pathname]);

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const langLabel = locale === 'ar' ? 'English' : 'العربية';

  // Close mobile menu when clicking outside or on a link
  useEffect(() => {
    if (isMobileMenuOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingInlineEnd = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingInlineEnd = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingInlineEnd = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="sticky w-full z-50 top-0 transition-all duration-300 border-b border-stone-200/50 bg-[#FDFCF8]">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="h-12 shrink-0">
              {LOGO_URL ? (
                <Image
                  src={LOGO_URL}
                  alt={SITE_NAME || t('brand')}
                  width={240}
                  height={64}
                  className="h-12 w-auto"
                />
              ) : (
                <Image
                  src={locale === 'ar' ? '/images/logo_ar_black.svg' : '/images/logo_en_black.svg'}
                  alt={t('brand')}
                  width={240}
                  height={64}
                  className="h-12 w-auto"
                />
              )}
            </div>
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

            {!isVendorMode && (
              <>
                <Link
                  href="/#how-it-works"
                  className="text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900 px-2 md:px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all cursor-pointer"
                >
                  {t('how_it_works')}
                </Link>

                <Link
                  href="/#pricing"
                  className="text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900 px-2 md:px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all cursor-pointer"
                >
                  {t('pricing')}
                </Link>

                <Link
                  href="/contact"
                  className="text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900 px-2 md:px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all cursor-pointer"
                >
                  {t('contact')}
                </Link>
              </>
            )}

            {isVendorMode && (
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "966500000000"}?text=${encodeURIComponent(locale === 'ar' ? 'مرحبًا، أحتاج مساعدة' : 'Hi, I need help')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900 px-2 md:px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <MessageCircle size={14} />
                <span>{locale === 'ar' ? 'تواصل معنا' : 'Contact us'}</span>
              </a>
            )}

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900 px-2 md:px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all cursor-pointer"
                >
                  {t('dashboard')}
                </Link>
                {user.email === "mashari7@yahoo.com" && (
                  <Link
                    href="/admin"
                    className="text-xs md:text-sm font-medium text-purple-600 hover:text-purple-800 px-2 md:px-3 py-1.5 rounded-md hover:bg-purple-50 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Shield size={14} />
                    Admin
                  </Link>
                )}
                <form action={signOut} className="hidden sm:block">
                  <button
                    type="submit"
                    className={`text-sm font-medium text-stone-600 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-all flex items-center gap-2 cursor-pointer ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
                  >
                    <LogOut size={16} />
                    <span className="hidden md:inline">{authT('sign_out')}</span>
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className={`text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all flex items-center gap-2 cursor-pointer ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
              >
                <User size={16} />
                <span className="hidden sm:inline">{authT('login')}</span>
              </Link>
            )}

            {(!isVendorMode || user) && (
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
            )}
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
          className="fixed inset-0 bg-black/50 z-60 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-64 bg-white shadow-xl z-60 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col p-6 space-y-4">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="self-end p-2 -mt-2 -mr-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>

          <Link
            href={pathname}
            locale={otherLocale}
            className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Globe size={18} />
            <span>{langLabel}</span>
          </Link>

          {!isVendorMode && (
            <>
              <Link
                href="/#how-it-works"
                className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>{t('how_it_works')}</span>
              </Link>

              <Link
                href="/#pricing"
                className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>{t('pricing')}</span>
              </Link>

              <Link
                href="/contact"
                className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Mail size={18} />
                <span>{t('contact')}</span>
              </Link>
            </>
          )}

          {isVendorMode && (
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "966500000000"}?text=${encodeURIComponent(locale === 'ar' ? 'مرحبًا، أحتاج مساعدة' : 'Hi, I need help')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <MessageCircle size={18} />
              <span>{locale === 'ar' ? 'تواصل معنا' : 'Contact us'}</span>
            </a>
          )}

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
              {user.email === "mashari7@yahoo.com" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-800 px-4 py-3 rounded-lg hover:bg-purple-50 transition-all cursor-pointer"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield size={18} />
                  <span>Admin</span>
                </Link>
              )}
              <form action={signOut} className="w-full">
                <button
                  type="submit"
                  className={`w-full flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 px-4 py-3 rounded-lg hover:bg-red-50 transition-all cursor-pointer ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
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
              className={`flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-3 rounded-lg hover:bg-stone-50 transition-all cursor-pointer ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User size={18} />
              <span>{authT('login')}</span>
            </Link>
          )}

          {(!isVendorMode || user) && (
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
          )}
        </div>
      </div>
    </>
  );
}
