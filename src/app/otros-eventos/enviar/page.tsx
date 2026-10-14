import type { Metadata } from "next";
import Link from "next/link";

import SubmitEventForm from "@/components/otros-eventos/SubmitEventForm";

export const metadata: Metadata = {
  title: "Comparte un evento — Otros eventos — Design Dinners",
  description: "Envía un evento para la comunidad de diseño. Lo revisamos y lo publicamos con tu afiche y tu enlace.",
};

export default function EnviarEventoPage() {
  return (
    <main className="min-h-screen bg-dd-cream text-dd-black">
      <div className="mx-auto w-full max-w-2xl px-5 py-8 md:py-14">
        <Link href="/otros-eventos" className="text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4">
          ← Otros eventos
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
          <a href="mailto:hola@gaborene.com?subject=Quitar%20evento%20de%20Otros%20eventos" className="underline">hola@gaborene.com</a>.
        </p>
      </div>
    </main>
  );
}
