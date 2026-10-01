/* eslint-disable @next/next/no-img-element -- local SVG brand asset needs no optimization */
import type { Metadata } from "next";

import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Acceso administrador — Design Dinners",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup } = await searchParams;
  const missingSupabase =
    setup === "supabase" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <img
          src="/brand/primary-black.svg"
          alt="Design Dinners"
          className="h-8 w-auto"
        />
        <h1 className="mt-8 font-display text-3xl font-bold uppercase tracking-tight text-dd-red">
          Panel de administración
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-dd-black/80">
          Ingresa tu correo y te enviaremos un enlace de acceso.
        </p>

        <div className="mt-8 w-full">
          {missingSupabase && (
            <p
              role="status"
              className="mb-5 rounded-md border border-dd-red/30 bg-dd-red/5 px-4 py-3 text-sm leading-relaxed text-dd-black"
            >
              El CMS está instalado, pero Supabase Auth todavía no está conectado
              en Vercel. Añade la URL y la llave publicable del proyecto para
              activar el acceso.
            </p>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
