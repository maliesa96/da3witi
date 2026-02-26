import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Inter, Cairo, Bricolage_Grotesque, Alexandria, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import "../globals.css";

const SITE_URL = new URL("https://www.da3witi.com");

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: 'swap',
});

const alexandria = Alexandria({
  subsets: ["arabic"],
  variable: "--font-alexandria",
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ["latin"],
  variable: "--font-instrument",
  display: 'swap',
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ["arabic"],
  variable: "--font-ibm-arabic",
  display: 'swap',
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  display: 'swap',
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Use existing marketing copy as a safe default for the whole locale segment.
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const brand = locale === "ar" ? "دعـوتـي" : "Da3witi";
  const description = t("description");

  return {
    metadataBase: SITE_URL,
    verification: {
      google: "WRfHWklz83tXOIsEtFWeQGcnWxMT20SdFdV6NRKuze8",
    },
    title: {
      default: brand,
      template: `%s | ${brand}`,
    },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
        "x-default": "/en",
      },
    },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: brand,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      images: [
        {
          url: `/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: brand,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/${locale}/twitter-image`],
    },
  };
}

import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

function JsonLd({ locale }: { locale: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Da3witi",
        alternateName: ["دعـوتـي", "da3witi", "Da3witi.com"],
        url: "https://da3witi.com",
        inLanguage: locale === "ar" ? "ar" : "en",
      },
      {
        "@type": "Organization",
        name: "Da3witi",
        alternateName: ["دعـوتـي", "da3witi"],
        url: "https://da3witi.com",
        logo: "https://da3witi.com/images/logo_en_black.svg",
        contactPoint: {
          "@type": "ContactPoint",
          email: "hello@da3witi.com",
          contactType: "customer service",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const {locale} = await params;
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction} className="scroll-smooth">
      <head>
        <JsonLd locale={locale} />
      </head>
      <body
        className={`${ibmPlexSansArabic.variable} ${inter.variable} ${cairo.variable} ${bricolageGrotesque.variable} ${alexandria.variable} ${instrumentSerif.variable} bg-stone-50 text-stone-800 font-sans antialiased selection:bg-stone-200 selection:text-stone-900 transition-colors duration-300 flex flex-col min-h-screen`}
      >
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          <main className="min-h-screen relative overflow-hidden flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
