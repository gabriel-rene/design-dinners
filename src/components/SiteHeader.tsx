/* eslint-disable @next/next/no-img-element -- local SVG brand assets need no optimization */

import Link from "next/link";

import SiteNav, { type SiteNavCurrent, type SiteNavTone } from "@/components/SiteNav";

export default function SiteHeader({
  whatsappUrl,
  current,
  tone = "light",
  contained = true,
}: {
  whatsappUrl: string;
  current?: SiteNavCurrent;
  /** "dark" for headers sitting on a red/dark hero. */
  tone?: SiteNavTone;
  /** false when the parent already sets width and side padding. */
  contained?: boolean;
}) {
  const logo =
    tone === "dark" ? (
      <img src="/brand/icon-mayo-cream.svg" alt="Design Dinners" className="h-[34px] w-auto shrink-0" />
    ) : (
      <img src="/brand/primary-black.svg" alt="Design Dinners" className="h-7 w-auto shrink-0 sm:h-8 md:h-9" />
    );
  const focus = tone === "dark" ? "focus-visible:outline-dd-yellow" : "focus-visible:outline-dd-black";

  return (
    <header
      className={`relative flex w-full items-center justify-between gap-4 ${
        contained ? "mx-auto max-w-6xl px-5 pt-6 md:px-8" : ""
      }`}
    >
      {current ? (
        <Link href="/" className={`block shrink-0 focus-visible:outline-3 focus-visible:outline-offset-4 ${focus}`}>
          {logo}
        </Link>
      ) : (
        logo
      )}
      <div className="flex items-center gap-x-5 lg:gap-x-7">
        <SiteNav whatsappUrl={whatsappUrl} current={current} tone={tone} />
      </div>
    </header>
  );
}
