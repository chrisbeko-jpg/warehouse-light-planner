import { CmsStaticPage, generateMetadata as genMeta } from "@/components/ledpaneel/CmsStaticPage";

export async function generateMetadata() {
  return genMeta({ slug: "werkwijze" });
}

export default function Page() {
  return <CmsStaticPage slug="werkwijze" />;
}
