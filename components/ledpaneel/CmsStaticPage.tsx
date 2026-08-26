import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentBlockRenderer } from "@/components/ledpaneel/ContentBlockRenderer";
import { getCmsPage, loadCmsSite, imagePublicUrl } from "@/lib/cms/content-store";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

export async function generateMetadata({ slug }: { slug: string }): Promise<Metadata> {
  const page = await getCmsPage(`/${slug}`);
  if (!page) return {};
  const seo = page.seo;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical ?? `${SITE_LINKS.siteUrl}/${slug}` },
    openGraph: {
      title: seo.ogTitle ?? seo.title,
      description: seo.ogDescription ?? seo.description,
      url: `${SITE_LINKS.siteUrl}/${slug}`,
      images: seo.ogImageId ? [{ url: imagePublicUrl(seo.ogImageId) }] : undefined,
    },
  };
}

export async function CmsStaticPage({ slug }: { slug: string }) {
  const site = await loadCmsSite();
  const page = site.pages[slug];
  if (!page) notFound();

  return (
    <>
      <section className="border-b border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] py-12">
        <div className="lp-container">
          <h1 className="lp-heading-1">{page.title}</h1>
          {page.intro && <p className="lp-body mt-4 max-w-2xl">{page.intro}</p>}
        </div>
      </section>
      {page.blocks.map((block) => (
        <ContentBlockRenderer key={block.id} block={block} site={site} />
      ))}
    </>
  );
}
