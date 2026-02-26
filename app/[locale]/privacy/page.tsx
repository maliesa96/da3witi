import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });

  const title = t("title");
  const description = t("intro");

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: {
        en: "/en/privacy",
        ar: "/ar/privacy",
        "x-default": "/en/privacy",
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/privacy`,
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });

  const sections = t.raw("sections") as Array<{
    heading: string;
    body: string;
  }>;

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-stone-900">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-stone-900 mb-3">
            {t("title")}
          </h1>
          <p className="text-sm text-stone-400 font-medium">{t("last_updated")}</p>
        </div>

        <p className="text-lg text-stone-600 leading-relaxed mb-12 pb-8 border-b border-stone-200">
          {t("intro")}
        </p>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <div key={i} className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-900">
                {section.heading}
              </h2>
              <p className="text-stone-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
