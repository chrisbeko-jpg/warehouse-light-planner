import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { faqStructuredData, PageBlocks } from "@/components/ledpaneel/ContentBlockRenderer";
import { getCmsPage, loadCmsSite } from "@/lib/cms/content-store";
import { resolveCmsImageUrl } from "@/lib/cms/resolve-image-url";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

export async function generateMetadata({ slug }: { slug: string }): Promise<Metadata> {
  const site = await loadCmsSite();
  const page = await getCmsPage(`/${slug}`);
  if (!page) return {};
  const seo = page.seo;
  const ogImage = seo.ogImageId ? resolveCmsImageUrl(site.images, seo.ogImageId) : undefined;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical ?? `${SITE_LINKS.siteUrl}/${slug}` },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seo.ogTitle ?? seo.title,
      description: seo.ogDescription ?? seo.description,
      url: `${SITE_LINKS.siteUrl}/${slug}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

function structuredDataForPage(slug: string, site: Awaited<ReturnType<typeof loadCmsSite>>) {
  const page = site.pages[slug];
  if (!page) return [];
  const scripts: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_LINKS.siteUrl },
        {
          "@type": "ListItem",
          position: 2,
          name: page.title,
          item: `${SITE_LINKS.siteUrl}/${slug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Lightsale / ledpaneel.nl",
      url: SITE_LINKS.siteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ledpaneel.nl",
      url: SITE_LINKS.siteUrl,
    },
  ];
  const faqBlock = page.blocks.find((b) => b.type === "faq");
  if (faqBlock?.type === "faq") {
    scripts.push(faqStructuredData(faqBlock));
  }
  return scripts;
}

export async function CmsStaticPage({ slug }: { slug: string }) {
  const site = await loadCmsSite();
  const page = site.pages[slug];
  if (!page) notFound();

  const showPageHeader = page.blocks[0]?.type !== "hero";
  const jsonLd = structuredDataForPage(slug, site);

  return (
    <>
      {jsonLd.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      {showPageHeader && (
        <section className="border-b border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] py-12">
          <div className="lp-container">
            <h1 className="lp-heading-1">{page.title}</h1>
            {page.intro && <p className="lp-body mt-4 max-w-2xl">{page.intro}</p>}
          </div>
        </section>
      )}
      <PageBlocks site={site} pageSlug={slug} />
    </>
  );
}
