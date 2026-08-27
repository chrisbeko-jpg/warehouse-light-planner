import type { Metadata } from "next";
import { ContentBlockRenderer } from "@/components/ledpaneel/ContentBlockRenderer";
import { loadCmsSite } from "@/lib/cms/content-store";
import { readMediaId, resolveMedia } from "@/lib/cms/media";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadCmsSite();
  const seo = site.homepage.seo;
  const ogMediaId = readMediaId({ mediaId: seo.ogMediaId, imageId: seo.ogImageId });
  const ogImage = ogMediaId ? resolveMedia(site.images, ogMediaId)?.url : undefined;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical ?? `${SITE_LINKS.siteUrl}/` },
    openGraph: {
      title: seo.ogTitle ?? seo.title,
      description: seo.ogDescription ?? seo.description,
      url: SITE_LINKS.siteUrl,
      siteName: "ledpaneel.nl",
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale: "nl_NL",
      type: "website",
    },
  };
}

export default async function LedpaneelHomePage() {
  const site = await loadCmsSite();
  return (
    <>
      {site.homepage.blocks.map((block) => (
        <ContentBlockRenderer key={block.id} block={block} site={site} />
      ))}
    </>
  );
}
