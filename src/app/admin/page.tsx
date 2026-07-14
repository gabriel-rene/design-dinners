import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";

import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Panel de administración — Design Dinners",
};

// Minimal authenticated placeholder — Task 8 builds the real dashboard
// (events/speakers/resources CRUD) here. The point of this page today is
// that it calls `requireAdmin()` directly, so the allowlist gate is real
// regardless of what the proxy (src/proxy.ts) does.
export default async function AdminPage() {
  const { user } = await requireAdmin();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-dd-red">
        Panel de administración
      </h1>
      <p className="mt-3 text-[15px]">
        Sesión iniciada como <strong>{user.email}</strong>
      </p>

      <form action={signOut} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-dd-black/25 px-4 py-2.5 text-[15px] font-medium transition-colors hover:border-dd-red hover:text-dd-red"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
