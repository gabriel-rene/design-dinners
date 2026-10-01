import type { Metadata } from "next";
import { inter, jost } from "./fonts";
import "./globals.css";

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
    </html>
  );
}
