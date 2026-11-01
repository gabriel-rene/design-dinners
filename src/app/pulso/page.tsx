import type { Metadata } from "next";

import { JOIN_PATH } from "@/lib/community";
import About from "@/components/landing/About";
import PulsoPage from "@/components/pulso/PulsoPage";
import SiteHeader from "@/components/SiteHeader";
import { parseLang } from "@/lib/pulso/validate";

const DESCRIPTION =
  "El primer estudio recurrente de la industria del diseño en Puerto Rico: una encuesta anual, un pulso trimestral y un informe abierto.";

// Hidden for now (owner's call): no link in the nav and kept out of search.
export const metadata: Metadata = {
  title: "Pulso del Diseño PR — Design Dinners",
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { title: "Pulso del Diseño PR", description: DESCRIPTION },
};

export default async function PulsoRoute({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const { lang } = await searchParams;
  const whatsappUrl = JOIN_PATH;

  return (
    <PulsoPage
      initialLang={parseLang(Array.isArray(lang) ? lang[0] : lang)}
      header={<SiteHeader whatsappUrl={whatsappUrl} linkLogo />}
      footer={<About whatsappUrl={whatsappUrl} />}
    />
  );
}
