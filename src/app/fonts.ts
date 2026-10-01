import { Inter, Jost } from "next/font/google";

/**
 * Body typeface. Neutral humanist sans that pairs on a contrast axis with the
 * geometric display face (Jost), per the brand
 * style sheet. Loaded and self-hosted by next/font — no external requests.
 */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Display face. Jost is the closest Google Fonts match to Futura (geometric
 * sans, same construction and proportions), so it replaces the licensed
 * Futura Condensed. Self-hosted by next/font — no external requests.
 */
export const jost = Jost({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jost",
  display: "swap",
});
