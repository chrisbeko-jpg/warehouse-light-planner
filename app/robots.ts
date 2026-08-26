import type { MetadataRoute } from "next";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/internal/", "/api/"],
    },
    sitemap: `${SITE_LINKS.siteUrl}/sitemap.xml`,
  };
}
