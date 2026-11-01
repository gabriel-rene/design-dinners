"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { submitPulsoInterest, type PulsoFormState } from "@/app/pulso/actions";
import type { PulsoCopy } from "@/content/pulso";
import {
  PULSO_ROLES,
  parsePulsoInput,
  pulsoRawFromFormData,
  type PulsoFieldErrors,
  type PulsoLang,
} from "@/lib/pulso/validate";

import s from "./pulso.module.css";

const INITIAL: PulsoFormState = { status: "idle" };
const FIELD_ORDER = ["name", "email", "organization", "roles", "message", "consent"] as const;

export default function PulsoForm({ copy, lang }: { copy: PulsoCopy["form"]; lang: PulsoLang }) {
  const [state, formAction, pending] = useActionState(submitPulsoInterest, INITIAL);
  // Checked in the browser first, with the same rules the server uses.
  const [clientErrors, setClientErrors] = useState<PulsoFieldErrors | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const errors: PulsoFieldErrors = clientErrors ?? (state.status === "error" ? (state.errors ?? {}) : {});
  const problem = state.status === "error" && !clientErrors ? state.problem : undefined;

  useEffect(() => {
    if (state.status === "received") doneRef.current?.focus();
  }, [state.status]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const parsed = parsePulsoInput(pulsoRawFromFormData(new FormData(event.currentTarget)));
    if (parsed.ok) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    setClientErrors(parsed.errors);
    const first = FIELD_ORDER.find((key) => parsed.errors[key]);
    formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
  }

  if (state.status === "received") {
    return (
      <div ref={doneRef} className={s.done} role="status" tabIndex={-1}>
        <h3>{copy.doneTitle}</h3>
        <p>{copy.doneText}</p>
      </div>
    );
  }

  const nameError = errors.name && copy.errors.name[errors.name];
  const emailError = errors.email && copy.errors.email[errors.email];

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className={s.form}>
      <input type="hidden" name="lang" value={lang} />
      <div className={s.trap} aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={s.two}>
        <div className={s.field}>
          <label htmlFor="pulso-name">
            {copy.name} <span className={s.req} aria-hidden="true">*</span>
          </label>
          <input
            id="pulso-name"
            data-field="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
            className={s.input}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "pulso-name-err" : undefined}
          />
          {nameError && <span id="pulso-name-err" className={s.err}>{nameError}</span>}
        </div>
        <div className={s.field}>
          <label htmlFor="pulso-email">
            {copy.email} <span className={s.req} aria-hidden="true">*</span>
          </label>
          <input
            id="pulso-email"
            data-field="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            className={s.input}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "pulso-email-err" : undefined}
          />
          {emailError && <span id="pulso-email-err" className={s.err}>{emailError}</span>}
        </div>
      </div>

      <div className={s.field}>
        <label htmlFor="pulso-org">
          {copy.organization} <span className={s.opt}>{copy.optional}</span>
        </label>
        <input
          id="pulso-org"
          data-field="organization"
          name="organization"
          type="text"
          autoComplete="organization"
          maxLength={160}
          className={s.input}
          aria-invalid={Boolean(errors.organization)}
        />
        {errors.organization && <span className={s.err}>{copy.errors.organization}</span>}
      </div>

      <fieldset className={s.fieldset} aria-describedby={errors.roles ? "pulso-roles-err" : undefined}>
        <legend className={s.legendLabel}>
          {copy.roles} <span className={s.req} aria-hidden="true">*</span>
        </legend>
        <div className={s.chips}>
          {PULSO_ROLES.map((role, i) => (
            <label key={role} className={s.chip}>
              <input type="checkbox" name="role" value={role} data-field={i === 0 ? "roles" : undefined} />
              <span>{copy.roleLabels[role]}</span>
            </label>
          ))}
        </div>
        {errors.roles && <span id="pulso-roles-err" className={s.err}>{copy.errors.roles}</span>}
      </fieldset>

      <div className={s.field}>
        <label htmlFor="pulso-msg">
          {copy.message} <span className={s.opt}>{copy.optional}</span>
        </label>
        <textarea
          id="pulso-msg"
          data-field="message"
          name="message"
          maxLength={2000}
          placeholder={copy.messagePlaceholder}
          className={s.input}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message && <span className={s.err}>{copy.errors.message}</span>}
      </div>

      <label className={s.consent}>
        <input
          type="checkbox"
          name="consent"
          data-field="consent"
          aria-describedby={errors.consent ? "pulso-consent-err" : undefined}
        />
        <span>{copy.consent}</span>
      </label>
      {errors.consent && (
        <span id="pulso-consent-err" className={`${s.err} ${s.consentErr}`}>
          {copy.errors.consent}
        </span>
      )}

      <div className={s.formFoot}>
        <button className={`dd-btn ${s.btn} ${s.btnRed}`} type="submit" disabled={pending}>
          {pending ? copy.sending : copy.send}
        </button>
        <small>{copy.note}</small>
      </div>
      {problem && (
        <p className={s.problem} role="alert">
          {copy.errors[problem]}
        </p>
      )}
    </form>
  );
}
