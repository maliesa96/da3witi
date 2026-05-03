"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarCheck, Users, QrCode } from "lucide-react";

export default function VendorLanding({
  locale,
  siteName,
  logoUrl,
}: {
  locale: string;
  siteName: string | null;
  logoUrl: string | null;
}) {
  const t = useTranslations("Auth");
  const isAr = locale === "ar";
  const brand = siteName || "Events";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4 py-16">
      {/* Hero */}
      <div className="text-center max-w-lg mx-auto space-y-8">
        {/* Logo / Brand */}
        {logoUrl ? (
          <div className="flex justify-center">
            <Image
              src={logoUrl}
              alt={brand}
              width={280}
              height={80}
              className="h-16 w-auto"
              priority
            />
          </div>
        ) : (
          <h1 className="text-4xl md:text-5xl font-display font-bold text-stone-900 tracking-tight">
            {brand}
          </h1>
        )}

        <p className="text-stone-500 text-base md:text-lg leading-relaxed">
          {isAr
            ? "تابع دعواتك وحالات الحضور في مكان واحد"
            : "Track your invitations and RSVPs in one place"}
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 shadow-sm">
            <CalendarCheck size={16} className="text-stone-400" />
            <span>{isAr ? "تتبع مباشر" : "Live tracking"}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 shadow-sm">
            <Users size={16} className="text-stone-400" />
            <span>{isAr ? "إدارة الضيوف" : "Guest management"}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 shadow-sm">
            <QrCode size={16} className="text-stone-400" />
            <span>{isAr ? "تسجيل حضور QR" : "QR check-in"}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href={`/${locale}/login`}
            className="w-full sm:w-auto bg-stone-900 text-white px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 group"
          >
            <span>{t("login")}</span>
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            />
          </Link>
          <Link
            href={`/${locale}/signup`}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-all shadow-sm flex items-center justify-center"
          >
            {t("signup")}
          </Link>
        </div>
      </div>
    </div>
  );
}
