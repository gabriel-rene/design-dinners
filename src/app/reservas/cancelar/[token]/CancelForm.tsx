"use client";

import Link from "next/link";
import { useActionState } from "react";

import { cancelReservation, type CancelState } from "./actions";

const MESSAGES: Record<Exclude<CancelState["status"], "idle" | "done">, string> = {
  already: "Esta reserva ya estaba liberada.",
  past: "Este evento ya pasó.",
  invalid: "Este enlace no es válido.",
  error: "No pudimos liberar tu puesto. Intenta de nuevo.",
};

export default function CancelForm({ token, eventId, waitlist }: { token: string; eventId: string; waitlist: boolean }) {
  const [state, formAction, isPending] = useActionState<CancelState, FormData>(
    cancelReservation.bind(null, token),
    { status: "idle" },
  );

  if (state.status === "done") {
    return (
      <div aria-live="polite" className="mt-6">
        <h2 className="font-display text-2xl font-bold uppercase leading-tight text-dd-red">
          {waitlist ? "Listo, saliste de la lista" : "Listo, liberaste tu puesto"}
        </h2>
        <p className="mt-2 leading-relaxed">
          {waitlist ? "Gracias por avisar." : "Gracias por avisar. Alguien más podrá sentarse a la mesa."}
        </p>
        <Link href={`/eventos/${eventId}`} className="mt-4 inline-block font-bold text-dd-brown underline underline-offset-[3px]">
          Ver el evento
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-[50px] items-center justify-center rounded-full border-2 border-dd-black bg-dd-red px-5 py-2 text-center text-[15px] font-bold leading-snug text-dd-cream dd-btn disabled:opacity-70"
      >
        {isPending ? "Liberando…" : waitlist ? "Sí, salir de la lista de espera" : "Sí, liberar mi puesto"}
      </button>
      <Link
        href={`/eventos/${eventId}`}
        className="flex min-h-[50px] items-center justify-center rounded-full border-2 border-dd-black px-5 py-2 text-center text-[15px] font-bold leading-snug dd-btn"
      >
        {waitlist ? "No, me quedo en la lista" : "No, me quedo con mi puesto"}
      </Link>
      <p aria-live="polite" role={state.status === "idle" ? undefined : "alert"} className="text-sm font-medium text-dd-red">
        {state.status === "idle" ? "" : MESSAGES[state.status]}
      </p>
    </form>
  );
}
