import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail, MessageCircle, ArrowRight, ArrowLeft, Clock3 } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {
        en: "/en/contact",
        ar: "/ar/contact",
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/contact`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });
  const isArabic = locale === "ar";

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-stone-900 selection:bg-purple-100 selection:text-purple-900">
      <section className="relative overflow-hidden px-6 py-12 md:py-20">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl" />
          <div className="absolute top-20 -right-20 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center space-y-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t("conciergeEyebrow")}
            </p>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter leading-[0.9] text-stone-900">
              {t("heading")}
            </h1>
            <div className="mx-auto mt-2 inline-flex max-w-full items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/80 px-5 py-3 text-xs font-medium text-stone-600 shadow-sm backdrop-blur-sm">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Clock3 size={14} className="text-stone-500" />
                {t("conciergeFastReplies")}
              </span>
              <span className="h-3 w-px bg-stone-200" />
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <MessageCircle size={14} className="text-stone-500" />
                {t("conciergeWhatsappFirst")}
              </span>
              <span className="h-3 w-px bg-stone-200" />
              <span className="dir-ltr whitespace-nowrap font-semibold text-stone-700">
                hello@da3witi.com
              </span>
            </div>
            <p className="mx-auto max-w-2xl text-lg md:text-xl font-light text-stone-500">
              {t("description")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <a
              href="mailto:hello@da3witi.com"
              className="group rounded-4xl border border-stone-200 bg-white p-8 shadow-lg shadow-stone-200/40 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white">
                <Mail size={20} />
              </div>
              <h2 className="mb-2 text-3xl font-display font-bold tracking-tight text-stone-900">
                {t("email.title")}
              </h2>
              <p className="mb-6 text-stone-500">{t("email.description")}</p>
              <div className="flex items-center justify-between border-t border-stone-100 pt-5">
                <span className="dir-ltr text-base font-semibold text-stone-800">
                  hello@da3witi.com
                </span>
                {isArabic ? (
                  <ArrowLeft className="text-stone-400 transition-transform group-hover:-translate-x-1" />
                ) : (
                  <ArrowRight className="text-stone-400 transition-transform group-hover:translate-x-1" />
                )}
              </div>
            </a>

            <a
              href="https://wa.me/96596685677"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-4xl border border-green-200/70 bg-linear-to-br from-green-50 to-white p-8 shadow-lg shadow-green-100/60 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white">
                <MessageCircle size={20} />
              </div>
              <h2 className="mb-2 text-3xl font-display font-bold tracking-tight text-stone-900">
                {t("whatsapp.title")}
              </h2>
              <p className="mb-6 text-stone-500">{t("whatsapp.description")}</p>
              <div className="flex items-center justify-between border-t border-green-100 pt-5">
                <span className="dir-ltr text-base font-semibold text-stone-800">
                  +965 96685677
                </span>
                {isArabic ? (
                  <ArrowLeft className="text-stone-400 transition-transform group-hover:-translate-x-1" />
                ) : (
                  <ArrowRight className="text-stone-400 transition-transform group-hover:translate-x-1" />
                )}
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
