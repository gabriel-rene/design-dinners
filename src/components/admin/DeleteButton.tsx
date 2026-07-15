"use client";

import { useActionState } from "react";

import { dangerBtn, type FormState } from "./formStyles";

/**
 * Confirm-then-delete control. `action` is a section delete action already bound
 * to its record id (`deleteEvent.bind(null, id)`), so its useActionState shape is
 * `(state, formData) => Promise<FormState>`. A native confirm() gates the submit
 * — right-sized for a three-section admin; a modal would be overkill here. On
 * success the action redirects; on failure it returns `{ error }`, shown inline.
 */
export default function DeleteButton({
  action,
  confirmMessage = "¿Eliminar este elemento? No se puede deshacer.",
  label = "Eliminar",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  confirmMessage?: string;
  label?: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <button type="submit" disabled={isPending} className={dangerBtn}>
        {isPending ? "Eliminando…" : label}
      </button>
      {state.error && (
        <span role="alert" className="text-[13px] font-medium text-dd-red">
          {state.error}
        </span>
      )}
    </form>
  );
}
