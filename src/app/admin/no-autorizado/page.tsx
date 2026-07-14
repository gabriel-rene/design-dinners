import type { Metadata } from "next";

import { signOut } from "../actions";

export const metadata: Metadata = {
  title: "Acceso no autorizado — Design Dinners",
};

// Reached when `requireAdmin()` finds a valid session whose email is not in
// `public.admins`. This page must NOT call `requireAdmin()` itself — that
// would redirect back here and loop.
export default function NoAutorizadoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-dd-red">
          Acceso no autorizado
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-dd-black/80">
          Tu cuenta inició sesión correctamente, pero no tiene permisos de
          administrador en Design Dinners.
        </p>

        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="rounded-md border border-dd-black/25 px-4 py-2.5 text-[15px] font-medium transition-colors hover:border-dd-red hover:text-dd-red"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
