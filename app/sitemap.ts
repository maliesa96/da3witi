import type { MetadataRoute } from "next";

const SITE = "https://www.da3witi.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Indexable routes only (marketing + wizard).
  return [
    {
      url: `${SITE}/ar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: { en: `${SITE}/en`, ar: `${SITE}/ar` } },
    },
    {
      url: `${SITE}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: { en: `${SITE}/en`, ar: `${SITE}/ar` } },
    },
    {
      url: `${SITE}/ar/wizard`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: { en: `${SITE}/en/wizard`, ar: `${SITE}/ar/wizard` } },
    },
    {
      url: `${SITE}/en/wizard`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: { en: `${SITE}/en/wizard`, ar: `${SITE}/ar/wizard` } },
    },
    {
      url: `${SITE}/ar/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: { en: `${SITE}/en/contact`, ar: `${SITE}/ar/contact` } },
    },
    {
      url: `${SITE}/en/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: { en: `${SITE}/en/contact`, ar: `${SITE}/ar/contact` } },
    },
  ];
}

