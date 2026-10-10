import type { CmsPage } from "@/types/cms";

/** Initial CMS seed for /kantoorverlichting — all editable via /internal/content */
export const KANTOORVERLICHTING_SEED: CmsPage = {
  slug: "/kantoorverlichting",
  title: "Kantoorverlichting",
  status: "published",
  marketingCopyGeneration: 2,
  intro:
    "Bereid kantoorverlichting voor met een indicatief lichtplan: LED-panelen of downlights, plafondtype en luxniveau — als uitgangspunt voor werkvoorbereiding.",
  primaryCtaText: "Start een lichtplan",
  primaryCtaHref: "/lichtadvies",
  seo: {
    title: "Kantoorverlichting berekenen & lichtplan | ledpaneel.nl",
    description:
      "Kantoorverlichting voorbereiden als installateur? Maak online een indicatief lichtplan met LED-panelen, lux-indicatie en materiaalbegroting.",
    ogTitle: "Kantoorverlichting voorbereiden? Begin met een goed lichtplan.",
    ogDescription:
      "Online lichtplanner voor kantoorprojecten: maatvoering, plafondtype en armatuurverdeling voor werkvoorbereiding.",
    canonical: "https://www.ledpaneel.nl/kantoorverlichting",
    noindex: false,
  },
  blocks: [
    {
      id: "hero-kantoor",
      type: "hero",
      tagline: "Kantoorverlichting",
      headline: "Kantoorverlichting voorbereiden? Begin met een goed lichtplan.",
      subheadline:
        "Een kantoorproject vraagt om verlichting die past bij de werkzaamheden, het plafond en de inrichting. Met onze online lichtplanner maak je snel een eerste indeling voor LED-panelen of downlights. Selecteer de ruimte, voer de maatvoering in en bekijk het indicatieve aantal armaturen voor jouw project.",
      primaryCta: "Start een lichtplan",
      primaryCtaHref: "/lichtadvies",
      secondaryCta: "Vraag technisch lichtadvies aan",
      secondaryCtaHref: "/contact",
    },
    {
      id: "compare-route",
      type: "rich-text",
      heading: "Waar let je op bij kantoorverlichting?",
      html: `<p>Bij werkvoorbereiding en ontwerp spelen onder andere mee:</p>
<ul>
<li><strong>Gewenste verlichtingssterkte</strong> — uitgangspunten per ruimtefunctie (bijv. circa 500 lux op werkplekken).</li>
<li><strong>Gelijkmatigheid</strong> — verdeling over het plafondraster of opbouw, zonder donkere zones.</li>
<li><strong>Verblinding en UGR</strong> — armatuurkeuze en positionering beïnvloeden comfort bij beeldschermwerk.</li>
<li><strong>Lichtkleur</strong> — veelal 3000K of 4000K, afhankelijk van sfeer en gebruik.</li>
<li><strong>Plafondtype</strong> — systeemplafond 60×60 of 120×60 versus vast plafond met opbouwarmaturen.</li>
<li><strong>Armatuurpositionering</strong> — afstemming op raster, looproutes en inrichting.</li>
<li><strong>Lichtregeling</strong> — dimmen, zones of sensoren waar het project om vraagt.</li>
</ul>
<p>Een indicatieve luxberekening in de online planner is bedoeld als <strong>uitgangspunt voor werkvoorbereiding</strong> en vervangt geen volledige toetsing aan NEN-EN 12464-1.</p>`,
    },
    {
      id: "lichtplan",
      type: "rich-text",
      heading: "Lichtplan als uitgangspunt",
      html: `<p>Een lichtplan vertaalt ruimteafmetingen, plafondtype en gewenst luxniveau naar een eerste armatuurindeling en materiaaloverzicht. Dat helpt bij calculatie, bestelling en overleg met de opdrachtgever.</p>
<p>De configurator op ledpaneel.nl richt zich op praktische situaties met LED-panelen en downlights. Voor complexere kantoren — meerdere lichtlagen, pendels, rails of maatwerk armaturen — kan Lightsale een uitgewerkt lichtontwerp leveren.</p>`,
    },
    {
      id: "lichtlagen",
      type: "benefits",
      heading: "Ondersteuning voor installatiebedrijven",
      items: [
        {
          title: "Snelle werkvoorbereiding",
          description:
            "Indicatief aantal armaturen, lux-indicatie en materiaalbegroting voor standaard kantoorruimtes.",
        },
        {
          title: "Lichtadvies en selectie",
          description:
            "Lightsale helpt bij armatuurkeuze, lichtregeling en projectspecifieke eisen.",
        },
        {
          title: "Uitgewerkt lichtontwerp",
          description:
            "Van materiaalbegroting tot compleet lichtplan met passende armaturen voor utiliteitsprojecten.",
        },
      ],
    },
    {
      id: "lux-normering",
      type: "rich-text",
      heading: "Lux en normering",
      html: `<p>Werkplekken worden in veel projecten rond 500 lux als uitgangspunt genomen; gangen en verkeerszones lager. De planner gebruikt vaste uitgangspunten per ruimtefunctie — afwijkingen per opdrachtgever of bestek zijn normaal.</p>
<p><strong>Definitieve normtoetsing en gedetailleerde lichtberekening</strong> horen bij engineering en leverancier/adviseur; de online tool levert een eerste ontwerpvoorstel, geen gecertificeerde lichtberekening.</p>`,
    },
    {
      id: "lichtkleur",
      type: "text-image",
      heading: "3000K, 4000K en lichtkleur",
      body:
        "3000K (warm wit) past bij comfortabele zones; 4000K (neutraal wit) is gangbaar op functionele werkplekken. In de lichtplanner kies je de kleurtemperatuur voor de geselecteerde LED-panelen of downlights.",
      html: `<p><strong>3000K</strong> — warm wit, comfortabel.</p><p><strong>4000K</strong> — neutraal wit, functioneel.</p><p>Start een <a href="/lichtadvies">lichtplan</a> om direct een indeling te zien.</p>`,
    },
    {
      id: "geen-panelen-overal",
      type: "rich-text",
      heading: "Systeemplafond, panelen en downlights",
      html: `<p>LED-panelen 595×595 mm passen in veel systeemplafonds 60×60. Bij 120×60 modules worden langwerpige panelen of gecentreerde downlights voorgesteld. Op vast plafond werkt de planner met opbouwarmaturen.</p>
<p>Niet elk kantoor vraagt om een volledig raster panelen. Bij representatieve of architectonische projecten combineren we vaak meerdere armatuurtypen — daar ondersteunt Lightsale naast de online planner.</p>`,
    },
    {
      id: "werkwijze",
      type: "steps",
      heading: "Zo maak je een lichtplan",
      cta: "Start een lichtplan",
      ctaHref: "/lichtadvies",
      items: [
        { title: "Ruimte en luxniveau", description: "Kies kantoorwerkplek, ontvangstzone of overige ruimte." },
        { title: "Plafond en lichtkleur", description: "Systeemplafond of vast plafond; 3000K of 4000K." },
        { title: "Maatvoering", description: "Plattegrond uploaden of afmetingen invoeren." },
        { title: "Controleren en offerte", description: "Indeling aanpassen en projectofferte aanvragen." },
      ],
    },
    {
      id: "voorbeeld-project",
      type: "example",
      heading: "Voorbeeld lichtplan",
      body: "Voorbeeld van armatuurverdeling en materiaaloverzicht. Afbeeldingen kun je via het CMS vervangen door eigen projectvoorbeelden.",
      resultExamples: Array.from({ length: 4 }, () => ({ mediaId: null })),
      imageIds: [],
    },
    {
      id: "lightsale",
      type: "rich-text",
      heading: "Lightsale achter ledpaneel.nl",
      html: `<p><strong>Lightsale</strong> ondersteunt elektrotechnische installateurs bij het selecteren en uitwerken van verlichting voor kantoren en utiliteitsprojecten — van een snelle materiaalbegroting tot een uitgewerkt lichtontwerp met passende armaturen en lichtregeling.</p>
<p><a href="/contact">Vraag technisch lichtadvies aan</a> of <a href="/lichtadvies">start een lichtplan</a>.</p>`,
    },
    {
      id: "faq",
      type: "faq",
      heading: "Veelgestelde vragen over kantoorverlichting",
      items: [
        {
          question: "Hoeveel lux heb ik nodig op kantoor?",
          answer:
            "Dat hangt af van de ruimtefunctie. Werkplekken worden vaak rond 500 lux als uitgangspunt gebruikt; gangen en verkeerszones lager. De lichtplanner geeft een indicatie; definitieve engineering kan per project afwijken.",
        },
        {
          question: "Kies ik 3000K of 4000K?",
          answer:
            "3000K is warmer en comfortabeler; 4000K is neutraler en functioneler op werkplekken. Beide zijn beschikbaar in de configurator.",
        },
        {
          question: "Zijn LED-panelen geschikt voor systeemplafond?",
          answer:
            "Ja, 595×595 mm panelen passen in standaard 60×60 rasters. Bij 120×60 modules worden passende panelen of downlights voorgesteld.",
        },
        {
          question: "Is dit een gecertificeerde lichtberekening?",
          answer:
            "Nee. Het resultaat is indicatief voor werkvoorbereiding en vervangt geen volledige toetsing aan NEN-EN 12464-1.",
        },
        {
          question: "Kan Lightsale een professioneel lichtplan maken?",
          answer:
            "Ja. Voor complexere kantoren levert Lightsale maatwerk lichtontwerpen, armatuurselectie en projectoffertes.",
        },
        {
          question: "Kan ik eerst zelf een indicatief lichtplan maken?",
          answer:
            "Ja, via de online lichtplanner op /lichtadvies — geschikt voor eenvoudige situaties met LED-panelen of downlights.",
        },
        {
          question: "Wat kost een professioneel lichtontwerp?",
          answer:
            "Dat hangt af van scope en complexiteit. Neem contact op voor een indicatie op basis van je project.",
        },
        {
          question: "Werken jullie ook met pendels en railverlichting?",
          answer:
            "Ja, bij maatwerk kantoorprojecten. De online planner richt zich op panelen en downlights.",
        },
      ],
    },
    {
      id: "cta-bottom",
      type: "cta",
      heading: "Kantoorverlichting voor je volgende project?",
      body:
        "Maak een indicatief lichtplan voor werkvoorbereiding of vraag Lightsale om technisch lichtadvies.",
      buttonText: "Start een lichtplan",
      buttonHref: "/lichtadvies",
      secondaryButtonText: "Vraag technisch lichtadvies aan",
      secondaryButtonHref: "/contact",
    },
  ],
};
