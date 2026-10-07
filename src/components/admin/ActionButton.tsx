"use client";

import { useActionState } from "react";

import type { FormState } from "./formStyles";

/** One-button form for a bound server action, with its error shown inline. */
export default function ActionButton({
  action,
  label,
  pendingLabel,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction}>
      <button type="submit" disabled={isPending} className={className}>
        {isPending ? pendingLabel : label}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-sm font-medium text-dd-red">
          {state.error}
        </p>
      )}
    </form>
  );
}
