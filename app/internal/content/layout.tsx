import { CmsAdminShell } from "@/components/cms/CmsAdminShell";
import { getCmsStorageMeta, loadCmsDraft } from "@/lib/cms/content-store";

export const dynamic = "force-dynamic";

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  let meta: { publishedAt: string | null; draftUpdatedAt: string | null } = {
    publishedAt: null,
    draftUpdatedAt: null,
  };
  try {
    meta = await getCmsStorageMeta();
  } catch {
    /* allow CMS UI even when persistent storage is not configured yet */
  }
  return <CmsAdminShell meta={meta}>{children}</CmsAdminShell>;
}

export async function generateMetadata() {
  try {
    await loadCmsDraft();
  } catch {
    /* ignore storage errors for page metadata */
  }
  return { title: "Contentbeheer" };
}
