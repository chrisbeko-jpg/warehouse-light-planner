import type { CmsPage } from "@/types/cms";

/** Initial CMS seed for /kantoorverlichting — all editable via /internal/content */
export const KANTOORVERLICHTING_SEED: CmsPage = {
  slug: "/kantoorverlichting",
  title: "Kantoorverlichting",
  status: "published",
  intro:
    "Van een snel AI Lichtadvies tot een professioneel lichtontwerp voor uw kantoor. Ontdek welke verlichting past bij uw werkplekken, sfeer, normering en interieur.",
  primaryCtaText: "Start gratis AI Lichtadvies",
  primaryCtaHref: "/lichtadvies",
  seo: {
    title: "Kantoorverlichting & lichtplan voor kantoor | ledpaneel.nl",
    description:
      "Van een snel AI Lichtadvies tot een professioneel lichtontwerp voor uw kantoor. Ontdek welke verlichting past bij uw werkplekken, sfeer, normering en interieur.",
    ogTitle: "Kantoorverlichting & lichtplan voor kantoor | ledpaneel.nl",
    ogDescription:
      "Van een snel AI Lichtadvies tot een professioneel lichtontwerp voor uw kantoor. Ontdek welke verlichting past bij uw werkplekken, sfeer, normering en interieur.",
    canonical: "https://www.ledpaneel.nl/kantoorverlichting",
    noindex: false,
  },
  blocks: [
    {
      id: "hero-kantoor",
      type: "hero",
      tagline: "Kantoorverlichting",
      headline: "Kantoorverlichting die werkt én bij uw interieur past",
      subheadline:
        "Een goed verlicht kantoor vraagt om meer dan een raster met armaturen. Werkplekken, looproutes, vergaderruimtes en representatieve zones stellen ieder andere eisen aan licht. ledpaneel.nl helpt bij eenvoudige situaties met een snel AI Lichtadvies. Voor projecten waarin sfeer, architectuur en verschillende lichtlagen belangrijk zijn, werken de lichtontwerpers van Lightsale een maatwerk lichtplan uit.",
      primaryCta: "Start gratis AI Lichtadvies",
      primaryCtaHref: "/lichtadvies",
      secondaryCta: "Vraag professioneel lichtadvies aan",
      secondaryCtaHref: "/contact",
    },
    {
      id: "compare-route",
      type: "comparison",
      heading: "Snel AI Lichtadvies of professioneel lichtontwerp?",
      columns: [
        {
          title: "Snel AI Lichtadvies",
          intro: "Geschikt wanneer:",
          items: [
            "LED-panelen of downlights volstaan",
            "de ruimte relatief eenvoudig is",
            "snel een indicatie van aantallen gewenst is",
            "een eerste materiaalprijs gewenst is",
          ],
          ctaText: "Maak zelf een lichtvoorstel",
          ctaHref: "/lichtadvies",
        },
        {
          title: "Professioneel lichtontwerp",
          intro: "Geschikt wanneer:",
          items: [
            "verlichting onderdeel is van het interieur",
            "meerdere armatuurtypen worden gecombineerd",
            "pendelprofielen, rails of accentverlichting gewenst zijn",
            "uitstraling net zo belangrijk is als het technische lichtniveau",
          ],
          ctaText: "Bespreek mijn kantoorproject",
          ctaHref: "/contact",
        },
      ],
    },
    {
      id: "lichtplan",
      type: "rich-text",
      heading: "Lichtplan voor kantoor",
      html: `<p>Een professioneel lichtplan vertaalt de functie en architectuur van een kantoor naar concrete armaturen, posities en lichtniveaus. Daarbij kijken we niet alleen naar hoeveel licht nodig is, maar ook naar waar het licht nodig is, hoe het zich door de ruimte verdeelt en welke uitstraling past bij het interieur.</p>
<p>Bij kantoorverlichting spelen onder andere mee: ruimtefunctie, werkplekken en beeldschermgebruik, verticale verlichting, looproutes, plafondtype en plafondhoogte, reflecties, lichtkleur, sfeer en energiegebruik. De exacte invulling hangt altijd af van uw specifieke situatie.</p>`,
    },
    {
      id: "lichtlagen",
      type: "benefits",
      heading: "Lichtlagen in kantoorontwerp",
      items: [
        {
          title: "Basislicht",
          description:
            "Gelijkmatige functionele verlichting voor werkplekken en algemene zones.",
        },
        {
          title: "Accentlicht",
          description:
            "Licht waarmee wanden, kunst, architectuur of ontvangstzones meer nadruk krijgen.",
        },
        {
          title: "Decoratief licht",
          description:
            "Pendelarmaturen en andere zichtbare armaturen die deel uitmaken van het interieur.",
        },
        {
          title: "Indirect licht",
          description:
            "Verlichting via plafond of wand voor een rustiger en zachter ruimtelijk beeld.",
        },
      ],
    },
    {
      id: "lux-normering",
      type: "rich-text",
      heading: "Lux en normering",
      html: `<p>Niet iedere ruimte in een kantoor heeft dezelfde lichtbehoefte. Werkplekken worden vaak ontworpen rond circa 500 lux als uitgangspunt. Gangen en verkeerszones vragen doorgaans om een lager niveau. Representatieve ruimten kunnen andere eisen stellen.</p>
<p><strong>De exacte eisen hangen af van de functie van de ruimte, werkzaamheden en projectsituatie.</strong> Bij maatwerkprojecten beoordelen we welke normen en richtlijnen relevant zijn — zonder de AI-configurator voor te doen als gecertificeerde normberekening.</p>`,
    },
    {
      id: "lichtkleur",
      type: "text-image",
      heading: "3000K, 4000K en sfeer",
      body:
        "3000K geeft een warmer, comfortabeler gevoel en past goed bij hospitality-achtige zones. 4000K is neutraler en functioneler, en wordt veel toegepast in werkruimtes. Bij architectonische kantoorprojecten is de keuze vaak onderdeel van het interieurconcept — niet alleen een technische instelling.",
      html: `<p><strong>3000K</strong> — warmer, comfortabel, meer hospitality-uitstraling.</p><p><strong>4000K</strong> — neutraler, functioneler, veel toegepast in werkruimtes.</p><p>Bij architectonische kantoorprojecten is lichtkleur onderdeel van het interieurconcept. Voor een eenvoudige eerste keuze kunt u ook ons <a href="/lichtadvies">AI Lichtadvies</a> gebruiken.</p>`,
    },
    {
      id: "geen-panelen-overal",
      type: "rich-text",
      heading: "Waarom niet overal LED-panelen?",
      html: `<p>LED-panelen zijn efficiënt, voorspelbaar en vaak een uitstekende oplossing voor functionele kantoorruimtes. Maar niet ieder kantoor wordt mooier van een volledig plafondraster met panelen.</p>
<p>Bij representatieve kantoren kunnen andere oplossingen interessanter zijn: gependelde lijnverlichting, railverlichting, downlights, wallwashers, decoratieve armaturen en indirect licht. Daarmee onderscheidt professioneel kantoorlicht zich van een standaard configurator.</p>`,
    },
    {
      id: "werkwijze",
      type: "steps",
      heading: "Onze werkwijze",
      cta: "Bespreek mijn kantoorproject",
      ctaHref: "/contact",
      items: [
        { title: "Kennismaken", description: "Wensen, ruimte en gebruik bespreken." },
        { title: "Analyse", description: "Plattegrond, interieur, werkplekken en technische randvoorwaarden beoordelen." },
        { title: "Lichtconcept", description: "Keuze voor lichtlagen, armatuurtypen, lichtkleur en uitstraling." },
        { title: "Lichtplan", description: "Armaturen positioneren en waar nodig lichttechnisch berekenen." },
        { title: "Levering en realisatie", description: "Producten leveren en waar gewenst afstemmen met installateur of montagepartner." },
      ],
    },
    {
      id: "voorbeeld-project",
      type: "example",
      heading: "Voorbeeld lichtontwerp",
      body: "Een lichtontwerp maakt zichtbaar hoe techniek en sfeer samenkomen voordat de verlichting wordt besteld. Upload later zelf plattegrond, 2D lichtplan, 3D visualisatie of projectfoto's via het CMS.",
      resultExamples: Array.from({ length: 4 }, () => ({ mediaId: null })),
      imageIds: [],
    },
    {
      id: "lightsale",
      type: "rich-text",
      heading: "Lightsale expertise",
      html: `<p>Achter ledpaneel.nl staat <strong>Lightsale</strong>: een lichtspecialist die dagelijks werkt aan lichtplannen voor kantoren, bedrijfsruimtes, horeca, woningen en andere projecten.</p>
<p>Bij maatwerkprojecten kijken we niet alleen naar één armatuurtype, maar naar de complete lichtoplossing. <a href="/contact">Vraag professioneel lichtadvies aan</a> of bekijk eerst onze <a href="/werkwijze">werkwijze</a>.</p>`,
    },
    {
      id: "faq",
      type: "faq",
      heading: "Veelgestelde vragen over kantoorverlichting",
      items: [
        {
          question: "Hoeveel lux heb ik nodig op kantoor?",
          answer:
            "Dat hangt af van de ruimtefunctie. Werkplekken worden vaak rond 500 lux ontworpen; gangen en verkeerszones lager. Onze AI-configurator geeft een indicatie, maatwerkprojecten worden per situatie beoordeeld.",
        },
        {
          question: "Kies ik 3000K of 4000K?",
          answer:
            "3000K is warmer en comfortabeler; 4000K is neutraler en functioneler. Bij maatwerkprojecten is de keuze vaak onderdeel van het interieurconcept.",
        },
        {
          question: "Zijn LED-panelen geschikt voor ieder kantoor?",
          answer:
            "Voor veel functionele kantoorruimtes wel. Bij representatieve of architectonische projecten combineren we vaak meerdere armatuurtypen.",
        },
        {
          question: "Kunnen jullie ook een professioneel lichtplan maken?",
          answer:
            "Ja. Lightsale maakt maatwerk lichtplannen voor kantoren waarin sfeer, lichtlagen en interieur belangrijk zijn.",
        },
        {
          question: "Kunnen jullie verlichting leveren?",
          answer:
            "Ja. Lightsale levert armaturen en ondersteunt bij samenstelling van een complete lichtoplossing.",
        },
        {
          question: "Kunnen bestaande armaturen worden vervangen door LED?",
          answer:
            "In veel situaties wel. We beoordelen per project welke vervangings- of renovatiestrategie het meest passend is.",
        },
        {
          question: "Kan ik eerst zelf een indicatief lichtplan maken?",
          answer:
            "Ja, via ons gratis AI Lichtadvies op /lichtadvies. Dat is geschikt voor eenvoudige situaties met LED-panelen of downlights.",
        },
        {
          question: "Wat kost een professioneel lichtontwerp?",
          answer:
            "Dat hangt af van scope, grootte en complexiteit. Neem contact op voor een indicatie op basis van uw project.",
        },
        {
          question: "Werken jullie ook met gependelde profielen en railverlichting?",
          answer:
            "Ja. Bij maatwerk kantoorprojecten combineren we regelmatig pendels, rails, downlights en accentverlichting.",
        },
        {
          question: "Kunnen jullie rekening houden met bestaande werkplekken en plafondindeling?",
          answer:
            "Ja. Plattegrond, plafondtype en bestaande indeling zijn standaard onderdeel van onze analyse.",
        },
      ],
    },
    {
      id: "cta-bottom",
      type: "cta",
      heading: "Eerst zelf proberen of direct professioneel advies?",
      body:
        "Voor een eenvoudig kantoor kunt u binnen enkele minuten zelf een indicatief AI Lichtadvies maken. Is uitstraling, architectuur of maatwerk belangrijk? Dan kijken onze lichtspecialisten graag met u mee.",
      buttonText: "Start AI Lichtadvies",
      buttonHref: "/lichtadvies",
      secondaryButtonText: "Vraag professioneel lichtadvies aan",
      secondaryButtonHref: "/contact",
    },
    {
      id: "cta-wizard-link",
      type: "cta",
      heading: "Liever snel een indicatief LED-paneel lichtadvies?",
      body: "Upload uw plattegrond en ontvang binnen enkele minuten een indicatief lichtplan met LED-panelen.",
      buttonText: "Start gratis AI Lichtadvies",
      buttonHref: "/lichtadvies",
    },
  ],
};
