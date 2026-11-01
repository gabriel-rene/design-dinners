"use client";

import { useEffect, useRef, useState } from "react";

import { JOIN_PATH, hasJoinedCookie } from "@/lib/community";
import JoinForm from "./JoinForm";

const HEADING_ID = "join-dialog-title";

/** Plain left clicks on a same-origin link to /unete, in this tab. */
function joinLinkFrom(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = (event.target as Element | null)?.closest?.("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target && link.target !== "_self") return null;
  const url = new URL(link.href, window.location.href);
  return url.origin === window.location.origin && url.pathname === JOIN_PATH ? link : null;
}

/**
 * Mounted once in the root layout. Every "Únete al WhatsApp" button is a
 * plain link to /unete; this catches the click and opens the sign-up form
 * in a modal instead. Without JS, or once the visitor has signed up (cookie),
 * the link goes through and /unete answers on the server.
 */
export default function JoinDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = joinLinkFrom(event);
      if (!link || window.location.pathname === JOIN_PATH) return;
      if (hasJoinedCookie(document.cookie)) return;
      event.preventDefault();
      opener.current = link;
      setOpen(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const onClose = () => {
    document.documentElement.style.overflow = "";
    setOpen(false);
    opener.current?.focus();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={HEADING_ID}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself, not its content.
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[440px] overflow-visible rounded-2xl border-2 border-dd-black bg-dd-cream p-0 text-dd-black shadow-[4px_6px_0_0_var(--dd-black)] backdrop:bg-[rgba(0,0,0,0.65)] dd-dialog"
    >
      <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto px-5 pb-6 pt-7 md:px-7 md:pb-7 md:pt-8">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-dd-black transition-colors hover:bg-dd-black/[0.06] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-black"
        >
          <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden>
            <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        {/* Unmounted while closed: each opening starts a fresh form. */}
        {open && <JoinForm headingId={HEADING_ID} onDone={() => setOpen(false)} />}
      </div>
    </dialog>
  );
}
