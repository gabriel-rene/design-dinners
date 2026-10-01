import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { inter, jost } from "./fonts";
import "./globals.css";

// GA4 measurement ID (public by design). Loaded only on Vercel production so
// local dev and preview deploys don't pollute the numbers.
const GA_ID = "G-ZD7CZT5DY5";
const isProduction = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  title: "Design Dinners — Delicious Collective",
  description:
    "Design Dinners es la comunidad de diseño que se junta a cenar, aprender de speakers y compartir ideas. Únete a la próxima cena.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
      {isProduction && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
