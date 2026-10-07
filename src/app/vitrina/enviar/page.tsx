import type { Metadata } from "next";
import Link from "next/link";

import SubmitWorkForm from "@/components/vitrina/SubmitWorkForm";
import { INSTAGRAM_URL } from "@/lib/social";

export const metadata: Metadata = {
  title: "Comparte tu trabajo — La Vitrina — Design Dinners",
  description: "Envía tu obra a La Vitrina de Design Dinners. La revisamos y la publicamos con tus enlaces.",
};

export default function EnviarPage() {
  return (
    <main className="min-h-screen bg-dd-cream text-dd-black">
      <div className="mx-auto w-full max-w-2xl px-5 py-8 md:py-14">
        <Link href="/vitrina" className="text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4">
          ← La Vitrina
        </Link>
        <h1 className="mt-6 font-display text-[clamp(2.25rem,7vw,3.5rem)] font-bold uppercase leading-[0.95] text-dd-red">
          Comparte tu trabajo
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-dd-black/80">
          Sube una pieza de la que estés orgullosa u orgulloso. La revisamos y la publicamos con tu nombre y tus
          enlaces, para que la gente te encuentre (y te contrate).
        </p>
        <div className="mt-10">
          <SubmitWorkForm />
        </div>
        <p className="mt-12 text-sm text-dd-black/65">
          ¿Quieres quitar una obra? Escríbenos por{" "}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="underline">Instagram</a>.
        </p>
      </div>
    </main>
  );
}
