export type TicketProps = {
  variant: "confirmed" | "waitlist" | "received";
  guestName?: string;
  guestEmail?: string;
  position?: number;
  capacity: number | null;
  eventTitle: string;
  whenLabel: string; // "Vie 23 oct · 7:00 p. m."
  location: string | null;
  calendarHref: string;
  whatsappInviteHref: string;
  whatsappGroupHref: string;
};

export const TICKET_HEADING_ID = "rsvp-ticket-title";

const LABEL = "text-[12px] font-bold uppercase tracking-[0.06em] text-dd-brown";

function Perforation() {
  return (
    <div aria-hidden className="relative h-8">
      <div className="absolute inset-x-5 top-[15px] border-t-2 border-dashed border-dd-black/35" />
      <span className="dd-notch-l" />
      <span className="dd-notch-r" />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5" />
    </svg>
  );
}

/** The RSVP result, drawn as a printed ticket stub. Pure: no state. */
export default function RsvpTicket(props: TicketProps) {
  const { variant } = props;
  const header =
    variant === "waitlist"
      ? { bg: "bg-dd-yellow text-dd-black", kicker: "Lista de espera", title: "Estás en la fila" }
      : variant === "received"
        ? { bg: "bg-dd-brown text-dd-cream", kicker: "Design Dinners", title: "¡Anotado!" }
        : { bg: "bg-dd-red text-dd-cream", kicker: "Design Dinners", title: "¡Tienes puesto!" };

  return (
    <section aria-live="polite" aria-label={header.title} className="relative">
      {variant === "confirmed" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/mascot-full-color.svg"
          alt=""
          aria-hidden
          className="dd-peek pointer-events-none absolute -top-[78px] right-3.5 z-10 w-[86px] rotate-[7deg]"
        />
      )}
      <div className="dd-ticket-in relative rounded-2xl border-2 border-dd-black bg-dd-cream shadow-[4px_6px_0_0_var(--dd-black)]">
        <div className={`flex items-end justify-between gap-3 rounded-t-[14px] border-b-2 border-dd-black px-5 pb-[18px] pt-4 ${header.bg}`}>
          <div className="min-w-0 flex-1">
            <p className="flex justify-between gap-3 text-[12px] font-bold uppercase tracking-[0.1em]">
              <span>{header.kicker}</span>
              {variant === "confirmed" && props.position && (
                <span>Orden #{String(props.position).padStart(3, "0")}</span>
              )}
            </p>
            <h2
              id={TICKET_HEADING_ID}
              tabIndex={-1}
              className="mt-2.5 font-display text-[clamp(2rem,9vw,2.4rem)] font-extrabold uppercase leading-[0.95] focus:outline-none"
            >
              {header.title}
            </h2>
          </div>
          {variant === "waitlist" && props.position && (
            <p className="font-display text-6xl font-extrabold leading-[0.85]">
              <span className="sr-only">Puesto en la fila: </span>#{props.position}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 px-5 pb-1.5 pt-[18px]">
          {props.guestName && (
            <div>
              <p className={LABEL}>A nombre de</p>
              <p className="mt-1 font-display text-[26px] font-bold leading-[1.05] [overflow-wrap:anywhere]">{props.guestName}</p>
            </div>
          )}

          {variant === "confirmed" && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt className={LABEL}>Cuándo</dt>
                <dd className="mt-0.5 text-[15px] font-semibold">{props.whenLabel}</dd>
              </div>
              {props.location && (
                <div>
                  <dt className={LABEL}>Dónde</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold">{props.location}</dd>
                </div>
              )}
              <div>
                <dt className={LABEL}>Evento</dt>
                <dd className="mt-0.5 text-[15px] font-semibold">{props.eventTitle}</dd>
              </div>
              {props.position && (
                <div>
                  <dt className={LABEL}>Asiento</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold">
                    {props.capacity ? `${props.position} de ${props.capacity}` : `#${props.position}`}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {variant === "waitlist" && (
            <p className="text-[15px] leading-relaxed">
              La mesa está llena. Si alguien cancela, el equipo te escribe a{" "}
              <strong className="[overflow-wrap:anywhere]">{props.guestEmail}</strong>.
            </p>
          )}

          {variant === "received" && (
            <p className="text-[15px] leading-relaxed">
              Recibimos tu reserva. Si ya te habías anotado con ese correo, todo sigue igual.
            </p>
          )}
        </div>

        <Perforation />

        <div className="flex flex-col gap-2.5 px-5 pb-5 pt-1">
          {variant === "waitlist" ? (
            <a
              href={props.whatsappGroupHref}
              className="flex min-h-[50px] items-center justify-center rounded-full border-2 border-dd-black bg-dd-red px-4 py-2 text-center leading-snug text-[15px] font-bold text-dd-cream dd-btn"
            >
              Únete al WhatsApp para la próxima
            </a>
          ) : (
            <>
              <a
                href={props.calendarHref}
                className="flex h-[50px] items-center justify-center gap-2.5 rounded-full border-2 border-dd-black bg-dd-black px-4 text-[15px] font-bold text-dd-cream dd-btn dd-btn--on-dark"
              >
                <CalendarIcon />
                Agregar a mi calendario
              </a>
              <a
                href={props.whatsappInviteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[50px] items-center justify-center rounded-full border-2 border-dd-black px-4 text-[15px] font-bold dd-btn"
              >
                Invita a un pana por WhatsApp
              </a>
            </>
          )}
        </div>
      </div>

      {variant === "confirmed" && (
        <p className="mx-1 mt-[18px] text-sm leading-relaxed text-dd-black/75">
          ¿No vas a poder llegar?{" "}
          <a href={props.whatsappGroupHref} className="font-bold text-dd-brown underline underline-offset-[3px]">
            Avísanos por WhatsApp
          </a>{" "}
          y le pasamos tu puesto a otra persona.
        </p>
      )}
    </section>
  );
}
