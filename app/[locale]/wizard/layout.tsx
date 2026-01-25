import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tHome = await getTranslations({ locale, namespace: "HomePage" });

  const title = tHome("cta_create");
  const description = tHome("description");

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/${locale}/wizard`,
      languages: {
        en: "/en/wizard",
        ar: "/ar/wizard",
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/wizard`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

