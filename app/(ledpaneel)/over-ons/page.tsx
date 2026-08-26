import { CmsStaticPage, generateMetadata as genMeta } from "@/components/ledpaneel/CmsStaticPage";

export async function generateMetadata() {
  return genMeta({ slug: "over-ons" });
}

export default function Page() {
  return <CmsStaticPage slug="over-ons" />;
}
