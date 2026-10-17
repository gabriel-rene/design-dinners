import type { Metadata } from "next";
import Link from "next/link";

import About from "@/components/landing/About";
import SubmitEventForm from "@/components/otros-eventos/SubmitEventForm";

export const metadata: Metadata = {
  title: "Comparte un evento — Eventos — Design Dinners",
  description: "Envía un evento para la comunidad de diseño. Lo revisamos y lo publicamos con tu afiche y tu enlace.",
};

export default function EnviarEventoPage() {
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";
  return (
    <main className="flex-1 bg-dd-cream text-dd-black">
      <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8 md:pb-24 md:pt-14">
        <Link href="/eventos" className="text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4">
          ← Eventos
        </Link>
        <h1 className="mt-6 font-display text-[clamp(2.25rem,7vw,3.5rem)] font-bold uppercase leading-[0.95] text-dd-red">
          Comparte un evento
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-dd-black/80">
          ¿Organizas algo para la comunidad de diseño? Envíalo. Lo revisamos y lo publicamos con tu afiche y tu enlace.
        </p>
        <div className="mt-10">
          <SubmitEventForm />
        </div>
        <p className="mt-12 text-sm text-dd-black/65">
          ¿Quieres quitar un evento? Escríbenos a{" "}
          <a href="mailto:hola@gaborene.com?subject=Quitar%20evento%20de%20la%20agenda" className="underline">hola@gaborene.com</a>.
        </p>
      </div>

      <About whatsappUrl={whatsappUrl} />
    </main>
  );
}
