import { CmsStaticPage, generateMetadata as genMeta } from "@/components/ledpaneel/CmsStaticPage";

export async function generateMetadata() {
  return genMeta({ slug: "led-panelen" });
}

export default function Page() {
  return <CmsStaticPage slug="led-panelen" />;
}
