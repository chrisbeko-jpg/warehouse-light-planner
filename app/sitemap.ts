import type { MetadataRoute } from "next";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_LINKS.siteUrl;
  const routes = [
    "",
    "/lichtadvies",
    "/led-panelen",
    "/kantoorverlichting",
    "/werkwijze",
    "/over-ons",
    "/contact",
    "/privacy",
    "/ai-calculator",
  ];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/lichtadvies" ? 0.9 : 0.7,
  }));
}
