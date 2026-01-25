import type { MetadataRoute } from "next";

const SITE = "https://da3witi.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Indexable routes only (marketing + wizard).
  return [
    {
      url: `${SITE}/ar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/ar/wizard`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE}/en/wizard`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}

