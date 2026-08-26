import type { CmsPage, CmsSiteContent, CmsWizardContent } from "@/types/cms";
import { ATMOSPHERES } from "@/lib/public-wizard/atmospheres";
import { ROOM_FUNCTIONS } from "@/lib/public-wizard/room-functions";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

const DEFAULT_HOMEPAGE: CmsPage = {
  slug: "/",
  title: "AI Lichtadvies voor kantoorverlichting",
  seo: {
    title: "ledpaneel.nl | AI Lichtadvies voor kantoorverlichting",
    description:
      "Upload uw plattegrond en ontvang binnen enkele minuten een indicatief lichtplan, lichtberekening en projectprijs voor uw kantoor.",
    ogTitle: "Van plattegrond naar lichtplan met AI",
    ogDescription:
      "Gratis AI Lichtadvies voor kantoorverlichting. Indicatief lichtplan, Light Indicator en richtprijs.",
  },
  blocks: [
    {
      id: "hero",
      type: "hero",
      headline: "Van plattegrond naar lichtplan met AI",
      subheadline:
        "Upload uw plattegrond, kies de gewenste sfeer en ontvang direct een indicatief lichtadvies voor uw kantoor.",
      primaryCta: "Start gratis AI Lichtadvies",
      primaryCtaHref: "/lichtadvies",
      secondaryCta: "Zo werkt het",
      secondaryCtaHref: "/werkwijze",
    },
    {
      id: "steps",
      type: "steps",
      heading: "Zo werkt AI Lichtadvies",
      cta: "Maak mijn lichtplan",
      ctaHref: "/lichtadvies",
      items: [
        {
          title: "Kies uw ruimte",
          description:
            "Vertel ons wat voor ruimte u wilt verlichten en welke uitstraling u zoekt.",
        },
        {
          title: "Upload uw plattegrond",
          description: "Upload eenvoudig een PDF, JPG of PNG.",
        },
        {
          title: "AI maakt een lichtvoorstel",
          description:
            "Het systeem berekent het benodigde lichtniveau en stelt een armaturenindeling voor.",
        },
        {
          title: "Ontvang lichtplan + offerte",
          description:
            "Na uw aanvraag controleert Lightsale het ontwerp en ontvangt u het uitgewerkte lichtplan met projectofferte.",
        },
      ],
    },
    {
      id: "example",
      type: "example",
      heading: "Voorbeeld van uw resultaat",
      body: "U ziet vooraf hoe de verlichting over de ruimte wordt verdeeld en krijgt direct inzicht in het benodigde aantal armaturen.",
      imageIds: [],
    },
    {
      id: "benefits",
      type: "benefits",
      heading: "Waarom AI Lichtadvies?",
      items: [
        { title: "Snel eerste voorstel", description: "Binnen enkele minuten een indicatief lichtvoorstel." },
        { title: "Lumenmethode", description: "Gebaseerd op oppervlakte, ruimtefunctie en gewenst luxniveau." },
        { title: "Zelf aanpassen", description: "Verplaats armaturen en voeg downlights toe waar nodig." },
        { title: "Light Indicator", description: "Indicatieve verdeling van licht over de ruimte." },
        { title: "Direct inzicht", description: "Aantallen armaturen en een richtprijs op het scherm." },
        { title: "Specialist controle", description: "Lightsale controleert uw aanvraag voordat u het definitieve plan ontvangt." },
      ],
    },
    {
      id: "products",
      type: "products",
      heading: "LED-panelen en downlights",
      intro:
        "De publieke configurator werkt met een zorgvuldig beperkte selectie van bewezen kantoorproducten.",
      items: [
        { name: "LED-paneel 595×595 – 3000K", description: "Warm en comfortabel kantoorlicht." },
        { name: "LED-paneel 595×595 – 4000K", description: "Helder en functioneel kantoorlicht." },
        { name: "Downlight Ø220 – 3000K", description: "Accent en kleinere zones, warm wit." },
        { name: "Downlight Ø220 – 4000K", description: "Accent en kleinere zones, neutraal wit." },
      ],
    },
    {
      id: "trust",
      type: "text",
      heading: "Lichtadvies met echte praktijkkennis",
      body: `De AI Lichtadviseur combineert automatische berekeningen met de praktijkkennis van Lightsale. Na uw aanvraag controleren onze lichtspecialisten het voorstel voordat u het definitieve lichtplan en de projectofferte ontvangt. Meer over Lightsale: ${SITE_LINKS.lightsaleUrl}`,
    },
    {
      id: "process",
      type: "text",
      heading: "Van gratis advies naar uw lichtplan",
      body: "Gratis AI Lichtadvies maken → Resultaat bekijken op scherm → Lichtplan + projectofferte aanvragen. U ontvangt geen directe PDF-download; het definitieve lichtplan wordt na controle door Lightsale verstuurd.",
    },
    {
      id: "cta-bottom",
      type: "cta",
      heading: "Klaar om te beginnen?",
      body: "Start vrijblijvend met een indicatief lichtadvies voor uw kantoorruimte.",
      buttonText: "Start gratis AI Lichtadvies",
      buttonHref: "/lichtadvies",
    },
  ],
};

function page(slug: string, title: string, seoTitle: string, description: string, blocks: CmsPage["blocks"]): CmsPage {
  return {
    slug,
    title,
    seo: { title: seoTitle, description, ogTitle: seoTitle, ogDescription: description },
    blocks,
  };
}

export const DEFAULT_WIZARD_CONTENT: CmsWizardContent = {
  roomChoices: ROOM_FUNCTIONS.map((room, index) => ({
    id: room.id,
    title: room.name,
    description: room.explanation,
    suggestedLux: room.suggestedLux,
    imageAlt: room.name,
    sortOrder: index,
    active: true,
  })),
  atmosphereChoices: ATMOSPHERES.map((item, index) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    description: item.presentationText,
    imageAlt: item.title,
    sortOrder: index,
    active: true,
    flow: item.id === "luxe" ? "kantoorverlichting" : "standard",
  })),
};

export const DEFAULT_CMS_SITE: CmsSiteContent = {
  version: 1,
  updatedAt: new Date().toISOString(),
  homepage: DEFAULT_HOMEPAGE,
  pages: {
    "led-panelen": page(
      "/led-panelen",
      "LED-panelen",
      "LED-panelen 595×595 | ledpaneel.nl",
      "Informatie over LED-panelen voor kantoorverlichting. 3000K en 4000K, indicatief lichtadvies met AI.",
      [
        {
          id: "intro",
          type: "text",
          heading: "LED-panelen voor kantoorverlichting",
          body: "Onze AI Lichtadviseur werkt met standaard 595×595 mm LED-panelen in warm wit (3000K) en neutraal wit (4000K). Geschikt voor open kantoren, vergaderruimtes en andere werkruimtes.",
        },
        {
          id: "products",
          type: "products",
          heading: "Beschikbare panelen",
          intro: "Vier producten in de publieke configurator:",
          items: [
            { name: "LED-paneel 595×595 – 3000K", description: "Warm, comfortabel kantoorlicht." },
            { name: "LED-paneel 595×595 – 4000K", description: "Helder, functioneel kantoorlicht." },
            { name: "Downlight Ø220 – 3000K", description: "Voor gangen, toiletten en accent." },
            { name: "Downlight Ø220 – 4000K", description: "Neutraal wit accentlicht." },
          ],
        },
        {
          id: "cta",
          type: "cta",
          heading: "Bereken uw lichtplan",
          body: "Upload uw plattegrond en ontvang een indicatief lichtadvies.",
          buttonText: "Start gratis AI Lichtadvies",
          buttonHref: "/lichtadvies",
        },
      ],
    ),
    kantoorverlichting: page(
      "/kantoorverlichting",
      "Kantoorverlichting",
      "Kantoorverlichting plan maken | ledpaneel.nl",
      "Maak een indicatief lichtplan voor kantoorverlichting met AI Lichtadvies. Snel, overzichtelijk en gecontroleerd door Lightsale.",
      [
        {
          id: "intro",
          type: "text-image",
          heading: "Kantoorverlichting op maat",
          body: "Of u nu een open kantoor, vergaderruimte of entree wilt verlichten: met AI Lichtadvies krijgt u snel inzicht in het benodigde aantal armaturen, indicatief luxniveau en richtprijs.",
        },
        {
          id: "benefits",
          type: "benefits",
          heading: "Voordelen voor kantoorprojecten",
          items: [
            { title: "Ruimtefunctie", description: "Voorgesteld luxniveau per ruimtetype." },
            { title: "Sfeerkeuze", description: "Warm, functioneel of luxe uitstraling." },
            { title: "Plattegrond", description: "Upload PDF, PNG of JPG." },
            { title: "Controle", description: "Lightsale checkt uw aanvraag." },
          ],
        },
        {
          id: "cta",
          type: "cta",
          heading: "Start uw kantoorlichtplan",
          body: "Gratis en indicatief — het definitieve plan volgt na controle.",
          buttonText: "Start gratis AI Lichtadvies",
          buttonHref: "/lichtadvies",
        },
        {
          id: "cta-wizard",
          type: "cta",
          heading: "Liever snel een indicatief LED-paneel lichtadvies?",
          body: "Upload uw plattegrond en ontvang binnen enkele minuten een indicatief lichtplan met LED-panelen.",
          buttonText: "Start gratis AI Lichtadvies",
          buttonHref: "/lichtadvies",
        },
      ],
    ),
    werkwijze: page(
      "/werkwijze",
      "Werkwijze",
      "Zo werkt AI Lichtadvies | ledpaneel.nl",
      "Stap voor stap uitleg van AI Lichtadvies: ruimte, sfeer, plattegrond, lichtplan en aanvraag.",
      [
        {
          id: "steps",
          type: "steps",
          heading: "Zo werkt AI Lichtadvies",
          cta: "Start gratis AI Lichtadvies",
          ctaHref: "/lichtadvies",
          items: DEFAULT_HOMEPAGE.blocks.find((b) => b.type === "steps")!.type === "steps"
            ? (DEFAULT_HOMEPAGE.blocks.find((b) => b.type === "steps") as import("@/types/cms").StepsBlock).items
            : [],
        },
        {
          id: "disclaimer",
          type: "text",
          heading: "Indicatief resultaat",
          body: "Het AI Lichtadvies is indicatief en gebaseerd op de lumenmethode. Het definitieve lichtplan wordt door Lightsale gecontroleerd voordat u het ontvangt.",
        },
      ],
    ),
    "over-ons": page(
      "/over-ons",
      "Over ons",
      "Over ledpaneel.nl | AI Lichtadvies",
      "AI Lichtadvies ontwikkeld door Lightsale. Praktijkkennis in kantoorverlichting en lichtontwerp.",
      [
        {
          id: "intro",
          type: "text",
          heading: "AI Lichtadvies ontwikkeld door Lightsale",
          body: "ledpaneel.nl biedt bedrijven een snelle manier om een indicatief lichtplan te maken. Het systeem is ontwikkeld vanuit de lichtontwerppraktijk van Lightsale, waar lichtspecialisten dagelijks werken aan kantoor- en projectverlichting.",
        },
      ],
    ),
    contact: page(
      "/contact",
      "Contact",
      "Contact | ledpaneel.nl",
      "Neem contact op over AI Lichtadvies of kantoorverlichting.",
      [
        {
          id: "intro",
          type: "text",
          heading: "Contact",
          body: `Vragen over AI Lichtadvies? Mail naar info@ledpaneel.nl of start direct uw indicatief lichtplan online.`,
        },
        {
          id: "cta",
          type: "cta",
          heading: "Direct aan de slag",
          body: "Maak gratis een indicatief lichtadvies voor uw kantoor.",
          buttonText: "Start gratis AI Lichtadvies",
          buttonHref: "/lichtadvies",
        },
      ],
    ),
    privacy: page(
      "/privacy",
      "Privacyverklaring",
      "Privacyverklaring | ledpaneel.nl",
      "Privacyverklaring van ledpaneel.nl en AI Lichtadvies.",
      [
        {
          id: "privacy",
          type: "text",
          heading: "Privacyverklaring",
          body: "Wij verwerken uw gegevens uitsluitend voor het opstellen van een indicatief lichtadvies en projectofferte. Gegevens worden niet gedeeld met derden, behalve waar nodig voor uitvoering van uw aanvraag door Lightsale. Voor vragen: info@ledpaneel.nl.",
        },
      ],
    ),
  },
  images: {},
  wizard: DEFAULT_WIZARD_CONTENT,
};

export function getDefaultPageBySlug(slug: string): CmsPage | null {
  if (slug === "/" || slug === "") return DEFAULT_CMS_SITE.homepage;
  const key = slug.replace(/^\//, "");
  return DEFAULT_CMS_SITE.pages[key] ?? null;
}
