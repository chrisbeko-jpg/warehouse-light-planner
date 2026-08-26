export type ContentBlockType =
  | "hero"
  | "text"
  | "text-image"
  | "image-text"
  | "benefits"
  | "steps"
  | "products"
  | "cta"
  | "faq"
  | "example"
  | "quote";

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
  ogImageId?: string;
}

export interface ContentBlockBase {
  id: string;
  type: ContentBlockType;
}

export interface HeroBlock extends ContentBlockBase {
  type: "hero";
  headline: string;
  subheadline: string;
  primaryCta: string;
  primaryCtaHref: string;
  secondaryCta: string;
  secondaryCtaHref: string;
  imageId?: string;
}

export interface TextBlock extends ContentBlockBase {
  type: "text";
  heading?: string;
  body: string;
}

export interface TextImageBlock extends ContentBlockBase {
  type: "text-image" | "image-text";
  heading: string;
  body: string;
  imageId?: string;
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
  items: { name: string; description: string; imageId?: string }[];
}

export interface CtaBlock extends ContentBlockBase {
  type: "cta";
  heading: string;
  body: string;
  buttonText: string;
  buttonHref: string;
}

export interface FaqBlock extends ContentBlockBase {
  type: "faq";
  heading: string;
  items: { question: string; answer: string }[];
}

export interface ExampleBlock extends ContentBlockBase {
  type: "example";
  heading: string;
  body: string;
  imageIds: string[];
}

export interface QuoteBlock extends ContentBlockBase {
  type: "quote";
  quote: string;
  author: string;
}

export type ContentBlock =
  | HeroBlock
  | TextBlock
  | TextImageBlock
  | BenefitsBlock
  | StepsBlock
  | ProductsBlock
  | CtaBlock
  | FaqBlock
  | ExampleBlock
  | QuoteBlock;

export interface CmsPage {
  slug: string;
  title: string;
  seo: CmsSeo;
  intro?: string;
  heroImageId?: string;
  blocks: ContentBlock[];
}

export interface CmsImageRecord {
  id: string;
  filename: string;
  mimeType: string;
  alt: string;
  createdAt: string;
}

export type WizardAtmosphereFlow = "standard" | "kantoorverlichting";

export interface WizardRoomChoiceCms {
  id: string;
  title: string;
  description: string;
  suggestedLux: number;
  imageId?: string;
  imageAlt: string;
  sortOrder: number;
  active: boolean;
}

export interface WizardAtmosphereChoiceCms {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageId?: string;
  imageAlt: string;
  sortOrder: number;
  active: boolean;
  flow: WizardAtmosphereFlow;
}

export interface CmsWizardContent {
  roomChoices: WizardRoomChoiceCms[];
  atmosphereChoices: WizardAtmosphereChoiceCms[];
}

export interface CmsSiteContent {
  version: number;
  updatedAt: string;
  homepage: CmsPage;
  pages: Record<string, CmsPage>;
  images: Record<string, CmsImageRecord>;
  wizard: CmsWizardContent;
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
