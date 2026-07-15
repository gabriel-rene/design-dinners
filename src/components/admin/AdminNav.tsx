/* eslint-disable @next/next/no-img-element -- local SVG brand asset needs no optimization */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/admin/actions";

const sections = [
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/speakers", label: "Speakers" },
  { href: "/admin/recursos", label: "Recursos" },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b-2 border-dd-black bg-dd-cream/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 md:px-8">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-red/40"
        >
          <img src="/brand/primary-black.svg" alt="Design Dinners" className="h-6 w-auto" />
          <span className="sr-only">Panel</span>
          <span
            aria-hidden
            className="hidden font-display text-sm font-bold uppercase tracking-wide text-dd-black/60 sm:inline"
          >
            Panel
          </span>
        </Link>

        <nav aria-label="Secciones" className="flex items-center gap-1">
          {sections.map((section) => {
            const active =
              pathname === section.href || pathname.startsWith(`${section.href}/`);
            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 font-display text-[15px] font-bold uppercase tracking-wide transition-colors ${
                  active
                    ? "bg-dd-red text-dd-cream"
                    : "text-dd-black hover:bg-dd-black/5"
                }`}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[13px] text-dd-black/65 sm:inline">{email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-dd-black/25 px-3 py-1.5 text-sm font-medium text-dd-black transition-colors hover:border-dd-red hover:text-dd-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-red/30"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
