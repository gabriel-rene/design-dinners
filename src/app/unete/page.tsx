/* eslint-disable @next/next/no-img-element -- local brand assets need no optimization */
import type { Metadata } from "next";

import SiteHeader from "@/components/SiteHeader";
import JoinForm from "@/components/join/JoinForm";
import About from "@/components/landing/About";

const TITLE = "Pon tu nombre en la mesa";
const DESCRIPTION =
  "Cuéntale a Design Dinners quién eres y qué diseñas. Para todos: los que llegan nuevos y los que ya están en el grupo de WhatsApp.";

export const metadata: Metadata = {
  title: `${TITLE} — Design Dinners`,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/brand/mesa-comunidad.jpg", width: 1600, height: 1200 }],
  },
};

// Anchor for every WhatsApp button on this page: the form is right here.
const FORM_ANCHOR = "#unete";

const REASONS = [
  "Saber quién forma la comunidad: diseñadores, estudiantes y educadores.",
  "Planificar cenas, charlas y talleres para todas las disciplinas, no solo para una.",
  "Que la mesa siga siendo de diseño.",
];

/**
 * The sign-up landing. Every "Únete al WhatsApp" button opens the same form
 * in a dialog; this page is where it lives on its own, to share in the group
 * itself (members already inside never gave us their info) and for visitors
 * without JS. It always shows the form, even to people who signed up before.
 */
export default function UnetePage() {
  return (
    <>
      <SiteHeader whatsappUrl={FORM_ANCHOR} />

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-6xl gap-x-16 gap-y-10 px-5 pb-16 pt-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:grid-rows-[auto_1fr] md:px-8 md:pb-24 md:pt-16">
          <div>
            <h1 className="font-display text-[clamp(3rem,9vw,5.5rem)] font-bold uppercase leading-[0.92] tracking-[-0.01em] text-balance text-dd-red">
              {TITLE}
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed">
              Design Dinners es la comunidad de diseño de Puerto Rico. Queremos saber quién se sienta a la mesa: tu
              nombre, tu correo y lo que haces. Toma un minuto.
            </p>

            <div className="mt-8 flex max-w-[52ch] gap-4 rounded-2xl border-2 border-dd-black bg-dd-yellow px-5 py-4">
              <img
                src="/brand/icon-double-blue-checkmarks.svg"
                alt=""
                aria-hidden
                className="mt-1 size-5 shrink-0"
              />
              <p className="text-[15px] leading-relaxed text-dd-black">
                <strong className="font-bold">¿Ya estás en el grupo de WhatsApp?</strong> Llénalo igual. El grupo no nos
                dice quién eres ni qué diseñas, y queremos conocerte.
              </p>
            </div>
          </div>

          <div
            id="unete"
            className="scroll-mt-6 md:sticky md:top-8 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start"
          >
            <div className="rounded-2xl border-2 border-dd-black bg-dd-cream px-5 pb-6 pt-7 shadow-[4px_6px_0_0_var(--dd-black)] md:px-7 md:pb-7 md:pt-8">
              <JoinForm
                headingId="unete-form-title"
                title="Cuéntanos de ti"
                intro={null}
                submitLabel="Enviar mis datos"
              />
            </div>
          </div>

          <section aria-labelledby="para-que" className="md:col-start-1">
            <h2 id="para-que" className="font-display text-2xl font-bold uppercase text-dd-black">
              Para qué lo usamos
            </h2>
            <ul className="mt-4 flex max-w-[52ch] flex-col gap-3">
              {REASONS.map((reason) => (
                <li key={reason} className="flex items-start gap-3 text-[17px] leading-relaxed">
                  <img src="/brand/icon-ketchup-red.svg" alt="" aria-hidden className="mt-1.5 size-4 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <About whatsappUrl={FORM_ANCHOR} />
    </>
  );
}
