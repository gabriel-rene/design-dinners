import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import JoinForm from "@/components/join/JoinForm";
import { hasJoined, whatsappGroupUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Únete al WhatsApp — Design Dinners",
  description: "Entra al grupo de WhatsApp de Design Dinners, la comunidad de diseño de Puerto Rico.",
};

/**
 * Where every "Únete al WhatsApp" link points. With JS the click opens the
 * dialog instead; this page is the fallback (no JS, a shared link) and the
 * shortcut for people who already signed up: they go straight to the group.
 * Signing up here sets the cookie, Next re-renders this page, and the
 * redirect sends them on to the group without the "¡Ya tienes silla!" step.
 */
export default async function UnetePage() {
  const url = whatsappGroupUrl();
  if (url && (await hasJoined())) redirect(url);

  return (
    <main className="flex-1 bg-dd-cream text-dd-black">
      <div className="mx-auto w-full max-w-[480px] px-5 pb-16 pt-8 md:pb-24 md:pt-14">
        <Link href="/" className="text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4">
          ← Inicio
        </Link>
        <div className="mt-8 rounded-2xl border-2 border-dd-black bg-dd-cream px-5 pb-6 pt-7 shadow-[4px_6px_0_0_var(--dd-black)] md:px-7 md:pb-7 md:pt-8">
          <JoinForm headingId="unete-title" />
        </div>
      </div>
    </main>
  );
}
