import { PageEditorClient } from "@/components/cms/PageEditorClient";
import { getCmsPage } from "@/lib/cms/content-store";

export default async function HomepageEditorPage() {
  const page = await getCmsPage("/", { draft: true });
  if (!page) return null;
  return <PageEditorClient slug="homepage" initialPage={page} previewSlug="homepage" />;
}
