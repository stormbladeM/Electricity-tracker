import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The admin panel is staff-only; /dev is component scaffolding.
      disallow: ["/admin", "/dev"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
