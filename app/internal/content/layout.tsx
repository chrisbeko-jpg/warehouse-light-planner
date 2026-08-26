import { CmsAdminShell } from "@/components/cms/CmsAdminShell";
import { getCmsStorageMeta, loadCmsDraft } from "@/lib/cms/content-store";

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const meta = await getCmsStorageMeta();
  return <CmsAdminShell meta={meta}>{children}</CmsAdminShell>;
}

export async function generateMetadata() {
  await loadCmsDraft();
  return { title: "Contentbeheer" };
}
