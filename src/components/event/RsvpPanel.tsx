"use client";

import { useActionState, useEffect, useRef } from "react";

import SeatTable from "./SeatTable";
import RsvpTicket, { TICKET_HEADING_ID } from "./RsvpTicket";
import { submitRsvp, type RsvpState } from "@/app/eventos/[id]/actions";
import type { RsvpMode } from "@/lib/rsvp";

export type PanelEvent = {
  id: string;
  title: string;
  capacity: number | null;
  confirmedCount: number;
  waitlistCount: number;
  mode: Exclude<RsvpMode, "closed" | "external">;
  whenLabel: string;
  location: string | null;
  calendarHref: string;
  whatsappInviteHref: string;
  whatsappGroupHref: string;
};

const INPUT =
  "h-[52px] w-full rounded-[10px] border-2 bg-[#FFF8EE] px-3.5 text-base font-medium text-dd-black outline-none placeholder:text-dd-black/60 focus-visible:ring-4 focus-visible:ring-dd-yellow/70";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-sm font-bold leading-snug text-white">
      <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-dd-yellow text-[13px] font-extrabold text-dd-black">
        !
      </span>
      {message}
    </p>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/** Seats card + RSVP form, swapped for the printed ticket once the action
 *  answers. Client-side so the visitor's plate can turn yellow in place. */
export default function RsvpPanel({ event }: { event: PanelEvent }) {
  const [state, formAction, pending] = useActionState<RsvpState, FormData>(
    submitRsvp.bind(null, event.id),
    { status: "idle" },
  );

  const seatsRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const justConfirmed = state.status === "confirmed";
  const justWaitlisted = state.status === "waitlist";
  // A seat can fill between page load and submit: a waitlist answer means the
  // table is full, whatever the page said when it rendered.
  const isFull = event.mode === "full" || justWaitlisted;

  // The action's revalidatePath re-renders this page in the same response, so
  // the counts usually already include the new RSVP. The returned position is
  // a floor either way, so the numbers are right with or without that refresh.
  let confirmed = event.confirmedCount;
  if (justConfirmed) confirmed = Math.max(confirmed, state.position);
  if (justWaitlisted && event.capacity !== null) confirmed = Math.max(confirmed, event.capacity);
  const waitlist = justWaitlisted ? Math.max(event.waitlistCount, state.position) : event.waitlistCount;
  const left = event.capacity === null ? null : Math.max(event.capacity - confirmed, 0);
  const mineIndex =
    justConfirmed && event.capacity !== null ? Math.min(state.position, event.capacity) - 1 : null;

  let headline: string;
  let caption: string;
  if (event.capacity === null) {
    headline = "Cupo abierto";
    caption = "No hay límite de asientos. Reserva para que sepamos cuántos somos.";
  } else if (justConfirmed) {
    headline = "Tu puesto está guardado";
    caption =
      left === 0
        ? state.position === event.capacity
          ? "El plato amarillo es el tuyo. Te llevaste el último asiento."
          : "El plato amarillo es el tuyo. Ya no quedan asientos."
        : `El plato amarillo es el tuyo. ${plural(left ?? 0, "Queda 1 asiento.", `Quedan ${left} asientos.`)}`;
  } else if (isFull) {
    headline = "Mesa llena";
    caption =
      waitlist === 0
        ? "Todavía nadie está en la lista de espera."
        : plural(waitlist, "Ya hay 1 persona en la lista de espera.", `Ya hay ${waitlist} personas en la lista de espera.`);
  } else if (left !== null && left <= 3) {
    headline = plural(left, "¡Solo queda 1!", `¡Solo quedan ${left}!`);
    caption = "Los últimos asientos se van rápido.";
  } else {
    headline = `Quedan ${left} de ${event.capacity} asientos`;
    caption = "Cada plato es un asiento en la mesa.";
  }

  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const values = state.status === "error" ? state.values : { name: "", email: "" };
  const ticketVariant =
    state.status === "confirmed" || state.status === "waitlist" || state.status === "received" ? state.status : null;

  // Move focus to what changed: the first invalid field, or the ticket
  // heading. On confirm, bring the seats card into view first so the yellow
  // plate is seen popping in.
  useEffect(() => {
    if (state.status === "error") {
      if (state.errors?.name) nameRef.current?.focus();
      else if (state.errors?.email) emailRef.current?.focus();
      return;
    }
    if (state.status === "idle") return;
    const heading = document.getElementById(TICKET_HEADING_ID);
    heading?.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = state.status === "confirmed" ? seatsRef.current : heading;
    if (target && target.getBoundingClientRect().top < 0) {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } else if (heading && heading.getBoundingClientRect().top > window.innerHeight * 0.6) {
      heading.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <section
        ref={seatsRef}
        aria-label="Asientos"
        className="scroll-mt-6 rounded-2xl border-2 border-dd-black bg-[#FFF8EE] px-4 pb-4 pt-[18px] md:px-[22px] md:pb-[18px] md:pt-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-bold md:text-[17px]">{headline}</p>
          <p className="shrink-0 font-display text-lg font-bold text-dd-brown md:text-xl">
            {event.capacity === null ? `${confirmed} van` : `${confirmed}/${event.capacity}`}
          </p>
        </div>
        {event.capacity !== null && (
          <div className="mt-4">
            <SeatTable capacity={event.capacity} confirmed={confirmed} mineIndex={mineIndex} />
          </div>
        )}
        <p className="mt-3.5 text-sm text-dd-black/75">{caption}</p>
      </section>

      {ticketVariant ? (
        <div className={state.status === "confirmed" ? "mt-14" : ""}>
          <RsvpTicket
            variant={ticketVariant}
            guestName={state.status === "confirmed" || state.status === "waitlist" ? state.name : undefined}
            guestEmail={state.status === "waitlist" ? state.email : undefined}
            position={state.status === "confirmed" || state.status === "waitlist" ? state.position : undefined}
            capacity={event.capacity}
            eventTitle={event.title}
            whenLabel={event.whenLabel}
            location={event.location}
            calendarHref={event.calendarHref}
            whatsappInviteHref={event.whatsappInviteHref}
            whatsappGroupHref={event.whatsappGroupHref}
          />
        </div>
      ) : (
        <section
          aria-labelledby="rsvp-title"
          className={`rounded-2xl border-2 border-dd-black px-5 pb-[22px] pt-6 shadow-[4px_6px_0_0_var(--dd-black)] md:px-[26px] md:pb-6 md:pt-7 ${
            isFull ? "bg-dd-brown" : "bg-dd-red"
          }`}
        >
          <h2 id="rsvp-title" className="font-display text-[32px] font-bold uppercase leading-none text-dd-cream md:text-4xl">
            {isFull ? "La mesa está llena" : "Reserva tu puesto"}
          </h2>
          <p className="mt-2.5 text-[15px] leading-normal text-white">
            {isFull
              ? "Únete a la lista de espera. Si alguien cancela, te escribimos."
              : "Solo tu nombre y tu correo. Toma diez segundos."}
          </p>

          {state.status === "error" && state.message && (
            <p role="alert" className="mt-4 rounded-[10px] border-2 border-dd-black bg-dd-cream px-3.5 py-2.5 text-sm font-semibold text-dd-black">
              {state.message}
            </p>
          )}

          <form action={formAction} noValidate className="mt-[22px] flex flex-col gap-[18px]">
            {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="rsvp-website">No llenes este campo</label>
              <input id="rsvp-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="rsvp-name" className="text-sm font-bold text-white">
                Tu nombre
              </label>
              <input
                ref={nameRef}
                key={`name-${state.status === "error" ? values.name : "idle"}`}
                id="rsvp-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                placeholder="Nombre y apellido"
                defaultValue={values.name}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "rsvp-name-error" : undefined}
                className={`${INPUT} ${errors.name ? "border-[3px] border-dd-yellow" : "border-dd-black"}`}
              />
              <FieldError id="rsvp-name-error" message={errors.name} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="rsvp-email" className="text-sm font-bold text-white">
                Tu correo
              </label>
              <input
                ref={emailRef}
                key={`email-${state.status === "error" ? values.email : "idle"}`}
                id="rsvp-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="tu@correo.com"
                defaultValue={values.email}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "rsvp-email-error" : undefined}
                className={`${INPUT} ${errors.email ? "border-[3px] border-dd-yellow" : "border-dd-black"}`}
              />
              <FieldError id="rsvp-email-error" message={errors.email} />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-1 h-14 w-full rounded-full border-2 border-dd-black bg-dd-yellow font-display text-[19px] font-bold uppercase tracking-[0.03em] text-dd-black dd-btn disabled:opacity-70 md:h-[58px] md:text-xl"
            >
              {pending ? "Guardando…" : isFull ? "Unirme a la lista" : "Reservar mi puesto"}
            </button>

            <p className="flex items-center gap-2 text-[13px] text-white/90">
              <LockIcon />
              Solo usamos tu correo para este evento. Nada de spam.
            </p>
          </form>
        </section>
      )}
    </div>
  );
}
