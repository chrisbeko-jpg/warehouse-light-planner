export type ContentBlockType =
  | "hero"
  | "text"
  | "rich-text"
  | "text-image"
  | "image-text"
  | "wide-image"
  | "benefits"
  | "steps"
  | "products"
  | "cta"
  | "faq"
  | "example"
  | "quote"
  | "comparison"
  | "ai-calculator-cta"
  | "ai-calculator-form";

export type CmsPageStatus = "draft" | "published";

export interface CmsImageRef {
  id: string;
  alt: string;
}

export interface CmsSeo {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogMediaId?: string | null;
  /** @deprecated use ogMediaId */
  ogImageId?: string;
  noindex?: boolean;
}

export interface MediaReference {
  mediaId: string | null;
  altTextOverride?: string;
}

export interface ExampleImageRef extends MediaReference {
  title?: string;
}

export interface ContentBlockBase {
  id: string;
  type: ContentBlockType;
}

export interface HeroBlock extends ContentBlockBase {
  type: "hero";
  tagline?: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  primaryCtaHref: string;
  secondaryCta: string;
  secondaryCtaHref: string;
  mediaId?: string | null;
  altTextOverride?: string;
  /** @deprecated use mediaId */
  imageId?: string;
  /** @deprecated use altTextOverride */
  imageAlt?: string;
}

export interface TextBlock extends ContentBlockBase {
  type: "text";
  heading?: string;
  body: string;
  html?: string;
}

export interface RichTextBlock extends ContentBlockBase {
  type: "rich-text";
  heading?: string;
  html: string;
}

export interface TextImageBlock extends ContentBlockBase {
  type: "text-image" | "image-text";
  heading: string;
  body: string;
  html?: string;
  mediaId?: string | null;
  altTextOverride?: string;
  /** @deprecated use mediaId */
  imageId?: string;
  /** @deprecated use altTextOverride */
  imageAlt?: string;
}

export interface WideImageBlock extends ContentBlockBase {
  type: "wide-image";
  mediaId?: string | null;
  /** @deprecated use mediaId */
  imageId?: string;
  alt: string;
  caption?: string;
}

export interface ComparisonBlock extends ContentBlockBase {
  type: "comparison";
  heading: string;
  columns: {
    title: string;
    intro: string;
    items: string[];
    ctaText: string;
    ctaHref: string;
  }[];
}

export interface BenefitsBlock extends ContentBlockBase {
  type: "benefits";
  heading: string;
  items: { title: string; description: string }[];
}

export interface StepsBlock extends ContentBlockBase {
  type: "steps";
  heading: string;
  cta: string;
  ctaHref: string;
  items: { title: string; description: string }[];
}

export interface ProductsBlock extends ContentBlockBase {
  type: "products";
  heading: string;
  intro: string;
  items: {
    name: string;
    description: string;
    mediaId?: string | null;
    altTextOverride?: string;
    /** @deprecated use mediaId */
    imageId?: string;
  }[];
}

export interface CtaBlock extends ContentBlockBase {
  type: "cta";
  heading: string;
  body: string;
  buttonText: string;
  buttonHref: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
}

export interface FaqBlock extends ContentBlockBase {
  type: "faq";
  heading: string;
  items: { question: string; answer: string; answerHtml?: string }[];
}

export interface ExampleBlock extends ContentBlockBase {
  type: "example";
  heading: string;
  body: string;
  resultExamples: ExampleImageRef[];
  /** @deprecated migrated to resultExamples */
  imageIds?: string[];
}

export interface QuoteBlock extends ContentBlockBase {
  type: "quote";
  quote: string;
  author: string;
}

export interface AiCalculatorCtaBlock extends ContentBlockBase {
  type: "ai-calculator-cta";
  heading: string;
  body: string;
  buttonText: string;
  buttonHref: string;
}

export interface AiCalculatorFormBlock extends ContentBlockBase {
  type: "ai-calculator-form";
  heading: string;
  intro: string;
  submitButtonText: string;
}

export type ContentBlock =
  | HeroBlock
  | TextBlock
  | RichTextBlock
  | TextImageBlock
  | WideImageBlock
  | ComparisonBlock
  | BenefitsBlock
  | StepsBlock
  | ProductsBlock
  | CtaBlock
  | FaqBlock
  | ExampleBlock
  | QuoteBlock
  | AiCalculatorCtaBlock
  | AiCalculatorFormBlock;

export interface CmsPage {
  slug: string;
  title: string;
  status?: CmsPageStatus;
  seo: CmsSeo;
  intro?: string;
  heroImageId?: string;
  heroImageAlt?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  blocks: ContentBlock[];
  updatedAt?: string;
  publishedAt?: string;
}

export interface CmsImageRecord {
  id: string;
  storageKey: string;
  url?: string;
  filename: string;
  originalFilename?: string;
  mimeType: string;
  alt: string;
  title?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt?: string;
}

export type WizardAtmosphereFlow = "standard" | "kantoorverlichting";

export interface WizardRoomChoiceCms {
  id: string;
  title: string;
  description: string;
  suggestedLux: number;
  mediaId?: string | null;
  altTextOverride?: string;
  /** @deprecated use mediaId */
  imageId?: string;
  /** @deprecated use altTextOverride */
  imageAlt: string;
  sortOrder: number;
  active: boolean;
}

export interface WizardAtmosphereChoiceCms {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  mediaId?: string | null;
  altTextOverride?: string;
  /** @deprecated use mediaId */
  imageId?: string;
  /** @deprecated use altTextOverride */
  imageAlt: string;
  sortOrder: number;
  active: boolean;
  /** When false, choice is visible but not selectable (e.g. Premium teaser). */
  enabled: boolean;
  badgeText?: string;
  flow: WizardAtmosphereFlow;
  ctaText?: string;
}

export interface CmsWizardContent {
  roomChoices: WizardRoomChoiceCms[];
  atmosphereChoices: WizardAtmosphereChoiceCms[];
}

export interface CmsNavigationItem {
  label: string;
  href: string;
}

export interface CmsNavigation {
  header: CmsNavigationItem[];
  footer: CmsNavigationItem[];
}

export interface CmsSitePayload {
  homepage: CmsPage;
  pages: Record<string, CmsPage>;
  images: Record<string, CmsImageRecord>;
  wizard: CmsWizardContent;
  navigation?: CmsNavigation;
}

/** Published content shape used by public pages (backward compatible). */
export interface CmsSiteContent extends CmsSitePayload {
  version: number;
  updatedAt: string;
  publishedAt?: string | null;
  draftUpdatedAt?: string | null;
}

export interface CmsSiteStorage {
  version: number;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
  published: CmsSitePayload;
  draft: CmsSitePayload;
}

export interface HomepageFields {
  heroTitle: string;
  heroText: string;
  heroImageId?: string;
  primaryCta: string;
  intro: string;
  benefitsHeading: string;
  benefits: { title: string; description: string }[];
  stepsHeading: string;
  steps: { title: string; description: string }[];
  stepsCta: string;
  exampleHeading: string;
  exampleText: string;
  exampleImageIds: string[];
  productsHeading: string;
  productsIntro: string;
  trustHeading: string;
  trustText: string;
  processHeading: string;
}

export const CMS_BLOCK_LABELS: Record<ContentBlockType, string> = {
  hero: "Hero",
  text: "Tekst",
  "rich-text": "Rich text",
  "text-image": "Tekst + afbeelding",
  "image-text": "Afbeelding + tekst",
  "wide-image": "Brede afbeelding",
  benefits: "Voordelen / kaarten",
  steps: "Stappen",
  products: "Productkaarten",
  cta: "CTA",
  faq: "FAQ",
  example: "Voorbeeldproject",
  quote: "Quote",
  comparison: "Vergelijking (2 kolommen)",
  "ai-calculator-cta": "AI Calculator CTA (B2B)",
  "ai-calculator-form": "AI Calculator formulier",
};
