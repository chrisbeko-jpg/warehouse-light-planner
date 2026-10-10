import type { CmsPage, CmsSiteContent, CmsWizardContent } from "@/types/cms";
import { CEILING_TYPES } from "@/lib/public-wizard/ceiling-types";
import { KANTOORVERLICHTING_SEED } from "@/lib/cms/seeds/kantoorverlichting";
import { ATMOSPHERES } from "@/lib/public-wizard/atmospheres";
import { PUBLIC_PRODUCTS } from "@/lib/public-wizard/products";
import { ROOM_FUNCTIONS } from "@/lib/public-wizard/room-functions";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

const DEFAULT_HOMEPAGE: CmsPage = {
  slug: "/",
  title: "Online lichtplanner voor installateurs",
  marketingCopyGeneration: 2,
  seo: {
    title: "ledpaneel.nl | Online lichtplan voor elektrotechnische professionals",
    description:
      "Maak snel een indicatief lichtplan voor kantoor en utiliteit: armatuurverdeling, lux-indicatie en materiaalbegroting. Ontwikkeld voor installateurs.",
    ogTitle: "Professioneel lichtplan. Binnen enkele minuten geregeld.",
    ogDescription:
      "Online lichtplanner voor installateurs: ruimte, plafondtype en maatvoering naar een eerste armatuurvoorstel en materiaaloverzicht.",
  },
  blocks: [
    {
      id: "hero",
      type: "hero",
      headline: "Professioneel lichtplan. Binnen enkele minuten geregeld.",
      subheadline:
        "Maak eenvoudig een lichtplan voor jouw installatieproject. Voer de afmetingen in of upload een plattegrond, kies het plafondtype en ontvang direct een voorstel met armatuurverdeling, indicatieve verlichtingssterkte en materiaalbegroting.",
      primaryCta: "Start je lichtplan",
      primaryCtaHref: "/lichtadvies",
      secondaryCta: "Hoe werkt het?",
      secondaryCtaHref: "/werkwijze",
      supportLine: "Ontwikkeld voor installateurs en elektrotechnische professionals.",
    },
    {
      id: "benefits",
      type: "benefits",
      heading: "Waarom ledpaneel.nl?",
      items: [
        {
          title: "Snel een eerste lichtplan",
          description:
            "Van ruimteafmetingen naar een bruikbaar verlichtingsvoorstel, zonder ingewikkelde software.",
        },
        {
          title: "Automatische armatuurverdeling",
          description:
            "LED-panelen en downlights worden logisch verdeeld op basis van ruimte, plafondtype en gewenste verlichtingssterkte.",
        },
        {
          title: "Direct inzicht in materiaalkosten",
          description:
            "Bekijk het aantal armaturen, de indicatieve luxwaarde en een overzichtelijke materiaalbegroting.",
        },
      ],
    },
    {
      id: "steps",
      type: "steps",
      heading: "Van maatvoering naar lichtplan in vier stappen",
      intro:
        "Geen uitgebreide lichtsoftware nodig voor een eerste projectvoorstel. Met onze online configurator werk je snel een praktische basisindeling uit.",
      cta: "Maak een lichtplan",
      ctaHref: "/lichtadvies",
      items: [
        {
          title: "Kies de ruimte",
          description: "Selecteer de toepassing en het gewenste verlichtingsniveau.",
        },
        {
          title: "Bepaal het plafondtype",
          description:
            "Kies een systeemplafond van 60×60 of 120×60 cm, of een vast plafond met opbouwarmaturen.",
        },
        {
          title: "Voer de maatvoering in",
          description: "Vul lengte, breedte en plafondhoogte in of upload een bestaande plattegrond.",
        },
        {
          title: "Bekijk en pas je lichtplan aan",
          description:
            "De tool berekent een indicatief aantal armaturen en verdeelt deze automatisch. Pas de posities aan waar nodig en vraag vervolgens een projectofferte aan.",
        },
      ],
    },
    {
      id: "example",
      type: "example",
      heading: "Voorbeeld van een lichtplan",
      body: "Zo ziet een automatische verdeling eruit: armaturen op het plafondraster, indicatieve lichtverdeling en een materiaaloverzicht voor je werkvoorbereiding.",
      imageIds: [],
      resultExamples: Array.from({ length: 4 }, () => ({ mediaId: null })),
    },
    {
      id: "products",
      type: "products",
      heading: "Armaturen in de configurator",
      intro:
        "Een praktische selectie LED-panelen (595×595 mm) en downlights voor systeemplafond en vast plafond — passend bij veel kantoor- en utiliteitsprojecten.",
      items: [
        { name: "LED-paneel 595×595 – 3000K", description: "Warm wit voor comfortabele werkruimtes." },
        { name: "LED-paneel 595×595 – 4000K", description: "Neutraal wit voor functionele omgevingen." },
        { name: "Downlight Ø220 – 3000K", description: "Opbouw, warm wit — o.a. gangen en zones." },
        { name: "Downlight Ø220 – 4000K", description: "Opbouw, neutraal wit — o.a. gangen en zones." },
      ],
    },
    {
      id: "trust",
      type: "text",
      heading: "Een handige tool voor je werkvoorbereiding",
      body: `Of je nu verlichting voorbereidt voor een kantoor, entree, gangzone of algemene ruimte: met ledpaneel.nl maak je snel een eerste verlichtingsvoorstel.

De configurator houdt rekening met de afmetingen van de ruimte, de plafondhoogte, het gekozen armatuur en het gewenste verlichtingsniveau.

Bij systeemplafonds worden armaturen gekoppeld aan het plafondraster. Je kunt de voorgestelde indeling daarna zelf aanpassen aan de praktijksituatie.

Zo heb je sneller een uitgangspunt voor je calculatie, materiaalkeuze en overleg met de opdrachtgever.`,
    },
    {
      id: "process",
      type: "cta",
      heading: "Jij installeert. Wij denken mee.",
      body: `Een goed lichtplan is meer dan alleen het aantal armaturen bepalen.

Met ledpaneel.nl maak je zelfstandig een eerste ontwerp. Heb je ondersteuning nodig bij een complexere ruimte, specifieke armaturen, lichtregeling of een uitgebreid lichtontwerp? Dan kan het team van Lightsale met je meekijken.

Wij ondersteunen installatiebedrijven met lichtadvies, armatuurselectie, lichtontwerpen en projectoffertes.`,
      buttonText: "Vraag een projectofferte aan",
      buttonHref: "/lichtadvies",
    },
    {
      id: "ai-calculator-cta",
      type: "ai-calculator-cta",
      heading: "Een eigen online lichtplanner voor jouw klanten?",
      body: "Met een digitale lichtconfigurator help je klanten sneller bij de eerste selectie van verlichting. Van ruimteafmetingen tot een indicatief lichtplan en materiaaloverzicht. Lightsale onderzoekt samen met je welke configuratie past bij jouw producten, klanten en commerciële proces.",
      buttonText: "Bespreek de mogelijkheden",
      buttonHref: "/ai-calculator",
    },
    {
      id: "cta-bottom",
      type: "cta",
      heading: "Klaar voor je volgende project?",
      body: "Start een indicatief lichtplan voor werkvoorbereiding — geen gecertificeerde lichtberekening, wel een concreet uitgangspunt.",
      buttonText: "Start je lichtplan",
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

const ROOM_DESCRIPTIONS: Record<(typeof ROOM_FUNCTIONS)[number]["id"], string> = {
  workplace_office:
    "Voor kantoorwerkplekken waar een gelijkmatige en comfortabele basisverlichting nodig is.",
  reception_hall:
    "Voor entrees, verkeersruimtes en ontvangstzones met functionele basisverlichting.",
  other_spaces: "Voor algemene ruimtes waar een lager basisverlichtingsniveau volstaat.",
};

export const DEFAULT_WIZARD_CONTENT: CmsWizardContent = {
  roomChoices: ROOM_FUNCTIONS.map((room, index) => ({
    id: room.id,
    title: room.name,
    description: ROOM_DESCRIPTIONS[room.id],
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
    enabled: item.id !== "premium_architectural",
    badgeText: item.id === "premium_architectural" ? "ONLY PREMIUM" : undefined,
    flow: "standard" as const,
  })),
  ceilingChoices: CEILING_TYPES.map((item, index) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    imageAlt: item.imageAlt,
    sortOrder: index,
    active: true,
  })),
  products: PUBLIC_PRODUCTS.map((product) => ({
    id: product.id,
    name: product.name,
    lumens: product.lumens,
    watts: product.watts,
    beamAngleDeg: product.beamAngleDeg,
    widthM: product.widthM,
    heightM: product.heightM,
    diameterM: product.diameterM,
    unitPriceEuro: product.unitPriceEuro,
  })),
};

export const DEFAULT_NAVIGATION = {
  header: [
    { label: "Lichtplanner", href: "/lichtadvies" },
    { label: "Kantoorverlichting", href: "/kantoorverlichting" },
    { label: "LED-panelen", href: "/led-panelen" },
    { label: "Werkwijze", href: "/werkwijze" },
    { label: "Contact", href: "/contact" },
  ],
  footer: [
    { label: "Home", href: "/home" },
    { label: "Lichtplanner", href: "/lichtadvies" },
    { label: "Kantoorverlichting", href: "/kantoorverlichting" },
    { label: "LED-panelen", href: "/led-panelen" },
    { label: "Werkwijze", href: "/werkwijze" },
    { label: "Over ons", href: "/over-ons" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
  ],
};

export const DEFAULT_CMS_SITE: CmsSiteContent = {
  version: 1,
  updatedAt: new Date().toISOString(),
  homepage: DEFAULT_HOMEPAGE,
  pages: {
    "led-panelen": page(
      "/led-panelen",
      "LED-panelen",
      "LED-panelen systeemplafond 595×595 | ledpaneel.nl",
      "LED-panelen voor systeemplafond en kantoorverlichting. Bereken indicatief aantal panelen en materiaalbegroting met de online lichtplanner.",
      [
        {
          id: "intro",
          type: "text",
          heading: "LED-panelen voor kantoor en utiliteit",
          body: "De lichtplanner werkt met standaard 595×595 mm LED-panelen in warm wit (3000K) en neutraal wit (4000K). Geschikt voor open kantoren, vergaderruimtes, gangzones en andere utiliteitsruimtes met systeemplafond 60×60.",
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
          heading: "LED-panelen berekenen",
          body: "Maak een indicatief lichtplan met armatuurverdeling en materiaalbegroting voor jouw project.",
          buttonText: "Start je lichtplan",
          buttonHref: "/lichtadvies",
        },
      ],
    ),
    kantoorverlichting: KANTOORVERLICHTING_SEED,
    werkwijze: page(
      "/werkwijze",
      "Werkwijze",
      "Online lichtplan maken | Werkwijze | ledpaneel.nl",
      "Van ruimtekeuze en plafondtype naar een indicatief lichtplan: werkwijze van de online lichtplanner voor installateurs.",
      [
        {
          id: "steps",
          type: "steps",
          heading: "Van maatvoering naar lichtplan in vier stappen",
          intro:
            "Geen uitgebreide lichtsoftware nodig voor een eerste projectvoorstel. Met onze online configurator werk je snel een praktische basisindeling uit.",
          cta: "Maak een lichtplan",
          ctaHref: "/lichtadvies",
          items: DEFAULT_HOMEPAGE.blocks.find((b) => b.type === "steps")!.type === "steps"
            ? (DEFAULT_HOMEPAGE.blocks.find((b) => b.type === "steps") as import("@/types/cms").StepsBlock).items
            : [],
        },
        {
          id: "disclaimer",
          type: "text",
          heading: "Indicatief uitgangspunt",
          body: "Het lichtplan is indicatief en bedoeld voor werkvoorbereiding. Het vervangt geen gecertificeerde lichtberekening of volledige toetsing aan NEN-EN 12464-1. Lightsale kan bij een projectofferte meekijken naar de definitieve invulling.",
        },
      ],
    ),
    "over-ons": page(
      "/over-ons",
      "Over ons",
      "Over ledpaneel.nl | Online lichtplanner",
      "Online lichtplanner voor installateurs, ontwikkeld door Lightsale. Praktijkkennis in kantoor- en projectverlichting.",
      [
        {
          id: "intro",
          type: "text",
          heading: "De online lichtplanner voor de elektrotechnische professional",
          body: `ledpaneel.nl helpt installateurs en werkvoorbereiders snel een eerste verlichtingsvoorstel te maken: armatuurverdeling, indicatieve lux en materiaalbegroting. De tool is ontwikkeld vanuit de lichtpraktijk van Lightsale (${SITE_LINKS.lightsaleUrl}), waar specialisten dagelijks werken aan kantoor- en utiliteitsprojecten.`,
        },
      ],
    ),
    contact: page(
      "/contact",
      "Contact",
      "Contact | ledpaneel.nl",
      "Contact over de lichtplanner, lichtadvies of kantoorverlichting voor installatieprojecten.",
      [
        {
          id: "intro",
          type: "text",
          heading: "Contact",
          body: `Vragen over de lichtplanner of ondersteuning bij een project? Mail naar info@ledpaneel.nl of start direct een lichtplan online.`,
        },
        {
          id: "cta",
          type: "cta",
          heading: "Direct aan de slag",
          body: "Maak een indicatief lichtplan voor je werkvoorbereiding.",
          buttonText: "Start je lichtplan",
          buttonHref: "/lichtadvies",
        },
      ],
    ),
    privacy: page(
      "/privacy",
      "Privacyverklaring",
      "Privacyverklaring | ledpaneel.nl",
      "Privacyverklaring van ledpaneel.nl en de online lichtplanner.",
      [
        {
          id: "privacy",
          type: "text",
          heading: "Privacyverklaring",
          body: "Wij verwerken je gegevens uitsluitend voor het opstellen van een indicatief lichtplan en projectofferte. Gegevens worden niet gedeeld met derden, behalve waar nodig voor uitvoering van je aanvraag door Lightsale. Voor vragen: info@ledpaneel.nl.",
        },
      ],
    ),
    "ai-calculator": page(
      "/ai-calculator",
      "Eigen lichtconfigurator",
      "Eigen online lichtplanner voor installateurs en leveranciers | Lightsale",
      "Digitale lichtconfigurator voor installatiebedrijven, groothandels en leveranciers. Indicatief lichtplan en materiaaloverzicht voor je klanten.",
      [
        {
          id: "hero",
          type: "hero",
          headline: "Een eigen online lichtplanner voor jouw klanten?",
          subheadline:
            "Met een digitale lichtconfigurator help je klanten sneller bij de eerste selectie van verlichting. Van ruimteafmetingen tot een indicatief lichtplan en materiaaloverzicht.",
          primaryCta: "Bespreek de mogelijkheden",
          primaryCtaHref: "#ai-calculator-form",
          secondaryCta: "",
          secondaryCtaHref: "",
        },
        {
          id: "intro",
          type: "rich-text",
          html: "<p>Lightsale onderzoekt samen met je welke configuratie past bij jouw producten, klanten en commerciële proces. Denk aan eigen assortiment, huisstijl en rekenregels — met een professionele flow van maatvoering naar offerteaanvraag.</p>",
        },
        {
          id: "benefits",
          type: "benefits",
          heading: "Wat kun je inrichten?",
          items: [
            { title: "Eigen producten", description: "Jouw assortiment, specificaties en prijslogica." },
            { title: "Eigen huisstijl", description: "Look & feel passend bij je merk of klantomgeving." },
            { title: "Lichtplan-output", description: "Indicatieve plattegrond, armatuurverdeling en rapportage." },
            { title: "Offerteaanvragen", description: "Leadgeneratie met gecontroleerde opvolging." },
            { title: "Koppelingen", description: "Integratie met CRM, ERP of interne systemen waar gewenst." },
            { title: "Eigen domein", description: "Publicatie onder jouw merk of subdomain." },
          ],
        },
        {
          id: "form",
          type: "ai-calculator-form",
          heading: "Bespreek de mogelijkheden",
          intro:
            "Vertel kort wat je zoekt. We nemen contact op om mogelijkheden, scope en planning te bespreken.",
          submitButtonText: "Verstuur aanvraag",
        },
      ],
    ),
  },
  images: {},
  wizard: DEFAULT_WIZARD_CONTENT,
  navigation: DEFAULT_NAVIGATION,
};

export function getDefaultPageBySlug(slug: string): CmsPage | null {
  if (slug === "/" || slug === "") return DEFAULT_CMS_SITE.homepage;
  const key = slug.replace(/^\//, "");
  return DEFAULT_CMS_SITE.pages[key] ?? null;
}
