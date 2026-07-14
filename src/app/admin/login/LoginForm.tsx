"use client";

import { useActionState } from "react";

import { requestMagicLink, type LoginState } from "./actions";

const initialLoginState: LoginState = { status: "idle", email: "" };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    requestMagicLink,
    initialLoginState,
  );

  if (state.status === "sent") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full rounded-lg border border-dd-black/15 bg-white/60 px-6 py-8 text-center"
      >
        <p className="text-lg font-semibold">Revisa tu correo</p>
        <p className="mt-2 text-[15px] leading-relaxed">
          Enviamos un enlace de acceso a <strong>{state.email}</strong>. Ábrelo
          desde este mismo navegador para entrar al panel.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full" noValidate>
      <div className="flex flex-col gap-2 text-left">
        <label htmlFor="email" className="text-sm font-medium">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "email-error" : undefined}
          className="rounded-md border border-dd-black/25 bg-white px-4 py-2.5 text-[15px] outline-none transition-colors focus-visible:border-dd-red focus-visible:ring-2 focus-visible:ring-dd-red/30"
          placeholder="tu@correo.com"
        />
      </div>

      {state.status === "error" && (
        <p id="email-error" role="alert" className="mt-2 text-sm text-dd-red">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 w-full rounded-md bg-dd-red px-4 py-2.5 text-[15px] font-semibold text-dd-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Enviando…" : "Enviar enlace de acceso"}
      </button>
    </form>
  );
}
