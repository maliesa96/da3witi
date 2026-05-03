import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HomePageClient from "./HomePageClient";
import { isVendorMode, SITE_NAME, LOGO_URL, VENDOR_SLUG } from "@/lib/vendor";
import { getVendorLanding } from "@/app/(vendor)/registry";
import VendorLanding from "./VendorLanding";

const CustomLanding = getVendorLanding(VENDOR_SLUG);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  const title = isVendorMode ? (SITE_NAME || "Events") : t("title");
  const description = t("description");

  return {
    title,
    description,
    robots: {
      index: !isVendorMode,
      follow: !isVendorMode,
    },
    alternates: isVendorMode ? undefined : {
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

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (isVendorMode) {
    const { locale } = await params;
    if (CustomLanding) {
      return <CustomLanding locale={locale} />;
    }
    return <VendorLanding locale={locale} siteName={SITE_NAME} logoUrl={LOGO_URL} />;
  }

  return <HomePageClient />;
}
