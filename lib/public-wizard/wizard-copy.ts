/** Fallback wizard copy when CMS fields are empty. Editable via CMS where noted. */
export const WIZARD_COPY = {
  headerTitle: "Online lichtplanner",
  headerSubtitle:
    "Indicatief lichtplan voor werkvoorbereiding — geen gecertificeerde lichtberekening. Definitieve controle via Lightsale bij offerteaanvraag.",

  room: {
    title: "Welke ruimte werk je uit?",
    intro: "Kies het luxniveau dat past bij de ruimtefunctie.",
    luxDisclaimer: "De luxwaarden zijn uitgangspunten en kunnen per toepassing en projectsituatie afwijken.",
    descriptions: {
      workplace_office:
        "Voor kantoorwerkplekken waar een gelijkmatige en comfortabele basisverlichting nodig is.",
      reception_hall:
        "Voor entrees, verkeersruimtes en ontvangstzones met functionele basisverlichting.",
      other_spaces: "Voor algemene ruimtes waar een lager basisverlichtingsniveau volstaat.",
    },
  },
  atmosphere: {
    title: "Welke lichtkleur past bij het project?",
    intro: "Kies de kleurtemperatuur voor de geselecteerde armaturen.",
  },
  ceiling: {
    title: "Welk plafond wordt toegepast?",
    intro:
      "Het plafondtype bepaalt welke armaturen we selecteren en hoe deze in het lichtplan worden geplaatst.",
  },
  inputMethod: {
    title: "Hoe wil je de ruimte invoeren?",
    intro: "Kies de invoer die past bij jouw werkvoorbereiding.",
    floorplan: {
      title: "Plattegrond uploaden",
      body: "Upload een PDF, JPG of PNG. Stel de schaal in en geef aan welke ruimte je wilt uitwerken.",
      cta: "Plattegrond gebruiken",
    },
    dimensions: {
      title: "Zelf afmetingen invoeren",
      body: "Geen plattegrond beschikbaar? Voer de lengte, breedte en plafondhoogte in. De ruimte wordt automatisch aangemaakt.",
      cta: "Maatvoering invoeren",
    },
  },
  dimensions: {
    title: "Wat zijn de afmetingen van de ruimte?",
    intro: "Vul lengte, breedte en plafondhoogte in meters in.",
    loading: "Je lichtplan wordt samengesteld…",
    loadingSub: "We berekenen het indicatieve aantal armaturen en maken een gelijkmatige verdeling.",
    submit: "Maak mijn lichtplan",
  },
  editor: {
    planReadyTitle: "Je eerste lichtplan is klaar",
    planReadyIntro:
      "De armaturen zijn automatisch verdeeld. Controleer de indeling en verplaats, verwijder of voeg armaturen toe waar nodig.",
    regenerate: "Lichtplan opnieuw verdelen",
    showDistribution: "Toon lichtverdeling",
    viewResult: "Bekijk resultaat",
    floorplanCheck: "Lichtplan bewerken",
  },
  result: {
    title: "Jouw lichtplan en materiaaloverzicht",
    intro:
      "Hieronder vind je het voorgestelde aantal armaturen, de indicatieve verlichtingssterkte en de bijbehorende materiaalbegroting.",
    preparationNote:
      "Dit voorstel is bedoeld als uitgangspunt voor de werkvoorbereiding. De uiteindelijke lichttechnische prestaties zijn afhankelijk van onder andere armatuurgegevens, reflectiewaarden, inrichting en montageomstandigheden.",
    requestCta: "Vraag je projectofferte aan",
  },
  request: {
    title: "Van lichtplan naar projectofferte",
    intro:
      "Wil je de geselecteerde armaturen bestellen of een prijsvoorstel ontvangen? Verstuur je lichtplan met de projectgegevens. Wij nemen je aanvraag in behandeling.",
    successTitle: "Je aanvraag is ontvangen",
    successBody:
      "Bedankt! Je lichtplan en projectgegevens zijn verstuurd. Lightsale neemt je aanvraag in behandeling.",
    successSub:
      "Stuur je lichtplan naar Lightsale. Wij bekijken de aanvraag en kunnen een passende projectofferte opstellen.",
  },
} as const;
