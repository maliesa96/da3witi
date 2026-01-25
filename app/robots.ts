import type { MetadataRoute } from "next";

const SITE = "https://da3witi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/ar/auth",
          "/en/auth",
          "/ar/login",
          "/en/login",
          "/ar/dashboard",
          "/en/dashboard",
          "/ar/checkout",
          "/en/checkout",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}

