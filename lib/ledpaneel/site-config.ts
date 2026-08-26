/** Central ledpaneel.nl design tokens — configure here, not in components. */
export const LP_TOKENS = {
  background: "#FFFFFF",
  backgroundSecondary: "#F5F7F6",
  primaryGreen: "#18A66A",
  darkGreen: "#087A4C",
  text: "#17211C",
  textSecondary: "#66706A",
  border: "#E1E7E3",
  white: "#FFFFFF",
} as const;

export const SITE_LINKS = {
  lightsaleUrl: process.env.NEXT_PUBLIC_LIGHTSALE_URL ?? "https://lightsale.nl",
  contactEmail: "info@ledpaneel.nl",
  salesEmail: "info@lightsale.nl",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ledpaneel.nl",
} as const;
