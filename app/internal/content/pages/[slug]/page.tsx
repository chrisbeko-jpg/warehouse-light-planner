import { notFound } from "next/navigation";
import { PageEditorClient } from "@/components/cms/PageEditorClient";
import { getCmsPage } from "@/lib/cms/content-store";

export default async function PageEditorRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getCmsPage(slug, { draft: true });
  if (!page) notFound();
  return <PageEditorClient slug={slug} initialPage={page} previewSlug={slug} />;
}
