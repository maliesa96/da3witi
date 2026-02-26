import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HomePageClient from "./HomePageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

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
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
        "x-default": "/en",
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function Home() {
  return <HomePageClient />;
}
