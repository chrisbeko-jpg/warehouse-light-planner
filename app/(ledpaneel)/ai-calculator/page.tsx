import { CmsStaticPage, generateMetadata as genMeta } from "@/components/ledpaneel/CmsStaticPage";

export async function generateMetadata() {
  return genMeta({ slug: "ai-calculator" });
}

export default function AiCalculatorPage() {
  return <CmsStaticPage slug="ai-calculator" />;
}
