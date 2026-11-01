/* eslint-disable @next/next/no-img-element -- local brand assets need no optimization */
import type { Metadata } from "next";

import SiteHeader from "@/components/SiteHeader";
import JoinForm from "@/components/join/JoinForm";

const TITLE = "Cuéntanos quién eres";
const DESCRIPTION =
  "Ayúdanos a armar la base de datos de la comunidad de diseño de Puerto Rico. Toma un minuto.";

export const metadata: Metadata = {
  title: `${TITLE} — Design Dinners`,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/brand/mesa-comunidad.jpg", width: 1600, height: 1200 }],
  },
};

// The header's WhatsApp button points at the form on this page.
const FORM_ANCHOR = "#unete";

// The owner's own promises about the data.
const PROMISES = ["Nunca vendemos tus datos.", "Se guardan en un lugar seguro.", "Nada de spam."];

/**
 * The sign-up landing. Every "Únete al WhatsApp" button opens the same form
 * in a dialog; this page is where it lives on its own, to share in the group
 * itself (members already inside never gave us their info) and for visitors
 * without JS. It always shows the form, even to people who signed up before.
 */
export default function UnetePage() {
  return (
    <>
      <SiteHeader whatsappUrl={FORM_ANCHOR} linkLogo />

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-x-16 gap-y-10 px-5 pb-16 pt-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:px-8 md:pb-24 md:pt-16">
          <div>
            <h1 className="font-display text-[clamp(3rem,9vw,5.5rem)] font-bold uppercase leading-[0.92] tracking-[-0.01em] text-balance text-dd-red">
              {TITLE}
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed">
              Ayúdanos a armar la base de datos de la comunidad de diseño. Así te avisamos de eventos y otra
              información importante.
            </p>

            <p className="mt-6 inline-block rounded-full border-2 border-dd-black bg-dd-yellow px-4 py-2 text-[15px] font-bold">
              ¿Ya estás en el WhatsApp? Llénalo igual.
            </p>

            <ul className="mt-8 flex flex-col gap-2.5">
              {PROMISES.map((promise) => (
                <li key={promise} className="flex items-center gap-3 text-[17px]">
                  <img src="/brand/icon-ketchup-red.svg" alt="" aria-hidden className="size-4 shrink-0" />
                  {promise}
                </li>
              ))}
            </ul>
          </div>

          <div id="unete" className="scroll-mt-6 md:sticky md:top-8">
            <div className="rounded-2xl border-2 border-dd-black bg-dd-cream px-5 pb-6 pt-7 shadow-[4px_6px_0_0_var(--dd-black)] md:px-7 md:pb-7 md:pt-8">
              <JoinForm headingId="unete-form-title" title="Tus datos" intro={null} submitLabel="Enviar" note={null} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
