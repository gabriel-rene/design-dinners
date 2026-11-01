"use client";

import { useActionState, useEffect, useRef } from "react";

import DisciplineField from "@/components/DisciplineField";
import { joinCommunity, type JoinState } from "@/app/unete/actions";
import { INSTAGRAM_URL } from "@/lib/social";

const INPUT =
  "h-[52px] w-full rounded-[10px] border-2 bg-white px-3.5 text-base font-medium text-dd-black outline-none placeholder:text-dd-black/55 focus-visible:ring-4 focus-visible:ring-dd-yellow/80";
const LABEL = "text-sm font-bold text-dd-black";
const control = (invalid: boolean) => `${INPUT} ${invalid ? "border-[3px] border-dd-red" : "border-dd-black"}`;
const REQUIRED = (
  <span aria-hidden className="text-dd-red">
    {" "}*
  </span>
);

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-sm font-bold leading-snug text-dd-red">
      <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-dd-red text-[13px] font-extrabold text-dd-cream">
        !
      </span>
      {message}
    </p>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/**
 * The WhatsApp sign-up: name, email, discipline. Once the server saves it,
 * the form turns into the button with the real invite link (the link only
 * ever arrives in this answer, never in the page). Used by the dialog and by
 * the /unete landing, which passes its own title and button label.
 */
export default function JoinForm({
  headingId,
  onDone,
  title = "Únete al WhatsApp",
  intro = "Es el grupo de la comunidad de diseño de Puerto Rico. Antes de entrar, cuéntanos quién eres.",
  submitLabel = "Ver el enlace",
}: {
  headingId: string;
  onDone?: () => void;
  title?: string;
  intro?: string | null;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(joinCommunity, { status: "idle" });
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const disciplineRef = useRef<HTMLSelectElement>(null);
  const doneRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (state.status === "joined") {
      doneRef.current?.focus();
      return;
    }
    if (state.status !== "error" || !state.errors) return;
    if (state.errors.name) nameRef.current?.focus();
    else if (state.errors.email) emailRef.current?.focus();
    else if (state.errors.discipline) disciplineRef.current?.focus();
    else if (state.errors.disciplineOther) document.getElementById("join-discipline-other")?.focus();
  }, [state]);

  if (state.status === "joined") {
    return (
      <div className="flex flex-col gap-5">
        <h2 id={headingId} className="font-display text-[32px] font-bold uppercase leading-none text-dd-red md:text-4xl">
          ¡Ya tienes silla!
        </h2>
        {state.url ? (
          <>
            <p className="text-[15px] leading-relaxed text-dd-black">
              Toca el botón para entrar al grupo. Ahí avisamos primero de cada cena, taller y evento.
            </p>
            <a
              ref={doneRef}
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onDone}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full border-2 border-dd-black bg-dd-red font-display text-[19px] font-bold uppercase tracking-[0.03em] text-dd-cream dd-btn md:h-[58px] md:text-xl"
            >
              <WhatsAppIcon />
              Entrar al grupo
              <span className="sr-only">(se abre en WhatsApp)</span>
            </a>
            <p className="text-sm leading-relaxed text-dd-black/75">
              ¿Ya estás en el grupo? Listo, no tienes que hacer nada más. Gracias por contarnos de ti.
            </p>
          </>
        ) : (
          <p className="text-[15px] leading-relaxed text-dd-black">
            Guardamos tus datos, pero el enlace del grupo no está disponible ahora mismo. Escríbenos por{" "}
            <a ref={doneRef} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-dd-red underline underline-offset-4">
              Instagram
            </a>{" "}
            y te lo pasamos.
          </p>
        )}
      </div>
    );
  }

  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const values =
    state.status === "error" ? state.values : { name: "", email: "", discipline: "", disciplineOther: "" };
  // Re-key the fields on each error answer so defaultValue shows what was sent.
  const k = state.status === "error" ? JSON.stringify(values) : "idle";

  return (
    <div>
      <h2 id={headingId} className="font-display text-[32px] font-bold uppercase leading-none text-dd-red md:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-2.5 text-[15px] leading-relaxed text-dd-black">{intro}</p>}

      {state.status === "error" && state.message && (
        <p role="alert" className="mt-4 rounded-[10px] border-2 border-dd-black bg-dd-yellow px-3.5 py-2.5 text-sm font-semibold text-dd-black">
          {state.message}
        </p>
      )}

      <form action={formAction} noValidate className="mt-5 flex flex-col gap-[18px]">
        {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="join-website">No llenes este campo</label>
          <input id="join-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="join-name" className={LABEL}>
            Tu nombre{REQUIRED}
          </label>
          <input
            ref={nameRef}
            key={`name-${k}`}
            id="join-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="Nombre y apellido"
            defaultValue={values.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "join-name-error" : undefined}
            className={control(Boolean(errors.name))}
          />
          <FieldError id="join-name-error" message={errors.name} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="join-email" className={LABEL}>
            Tu correo{REQUIRED}
          </label>
          <input
            ref={emailRef}
            key={`email-${k}`}
            id="join-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="tu@correo.com"
            defaultValue={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "join-email-error" : undefined}
            className={control(Boolean(errors.email))}
          />
          <FieldError id="join-email-error" message={errors.email} />
        </div>

        <DisciplineField
          key={`discipline-${k}`}
          ref={disciplineRef}
          idPrefix="join"
          defaultDiscipline={values.discipline}
          defaultOther={values.disciplineOther}
          errors={errors}
          labelClassName={LABEL}
          controlClassName={control}
          renderError={(id, message) => <FieldError id={id} message={message} />}
          required={REQUIRED}
        />

        <button
          type="submit"
          disabled={pending}
          className="mt-1 h-14 w-full rounded-full border-2 border-dd-black bg-dd-red font-display text-[19px] font-bold uppercase tracking-[0.03em] text-dd-cream dd-btn disabled:opacity-70 md:h-[58px] md:text-xl"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>

        <p className="text-[13px] leading-snug text-dd-black/75">
          <span aria-hidden className="text-dd-red">*</span> Requerido. Solo lo usamos para conocer la comunidad.
          Nada de spam.
        </p>
      </form>
    </div>
  );
}
