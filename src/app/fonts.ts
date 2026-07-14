import { Inter, Oswald } from "next/font/google";

/**
 * Body typeface. Neutral humanist sans that pairs on a contrast axis with the
 * condensed geometric display face (Futura Condensed / Oswald), per the brand
 * style sheet. Loaded and self-hosted by next/font — no external requests.
 */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Display fallback. Oswald is the closest Google-hosted match to Futura
 * Condensed (condensed grotesque, high x-height) and always ships, so headings
 * stay on-register even when the licensed Futura TTFs are absent. Weights match
 * the two Futura cuts we stage: 500 (Medium) and 700 (stand-in for ExtraBold).
 */
export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-oswald",
  display: "swap",
});
