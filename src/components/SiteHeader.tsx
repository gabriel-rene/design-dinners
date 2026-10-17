/* eslint-disable @next/next/no-img-element -- local SVG brand assets need no optimization */

import Link from "next/link";

import { INSTAGRAM_URL } from "@/lib/social";

const LINK_BASE =
  "text-[13px] font-bold uppercase tracking-wide underline sm:text-sm decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-dd-black";

type Current = "eventos" | "vitrina";

function cls(active: boolean) {
  return active ? `${LINK_BASE} text-dd-red` : LINK_BASE;
}

export default function SiteHeader({
  whatsappUrl,
  current,
}: {
  whatsappUrl: string;
  current?: Current;
}) {
  const logo = (
    <img
      src="/brand/primary-black.svg"
      alt="Design Dinners"
      className="h-7 w-auto shrink-0 sm:h-8 md:h-9"
    />
  );

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-6 md:px-8">
      {current ? (
        <Link
          href="/"
          className="shrink-0 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-dd-black"
        >
          {logo}
        </Link>
      ) : (
        logo
      )}
      <nav
        aria-label="Enlaces"
        className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-5 md:gap-x-7"
      >
        <Link
          href="/eventos"
          aria-current={current === "eventos" ? "page" : undefined}
          className={cls(current === "eventos")}
        >
          Eventos
        </Link>
        <Link
          href="/vitrina"
          aria-current={current === "vitrina" ? "page" : undefined}
          className={cls(current === "vitrina")}
        >
          Vitrina
        </Link>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_BASE}
        >
          Instagram
        </a>
        <a href={whatsappUrl} className={LINK_BASE}>
          WhatsApp
        </a>
      </nav>
    </header>
  );
}
