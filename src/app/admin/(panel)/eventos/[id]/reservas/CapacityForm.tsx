"use client";

import { useActionState } from "react";

import { inputClass, labelClass, secondaryBtn } from "@/components/admin/formStyles";

type CapacityState = { error?: string; ok?: boolean };

/** Inline capacity editor for the reservas summary. `action` is
 *  `updateCapacity` already bound to the event id. */
export default function CapacityForm({
  action,
  capacity,
}: {
  action: (state: CapacityState, formData: FormData) => Promise<CapacityState>;
  capacity: number | null;
}) {
  const [state, formAction, isPending] = useActionState<CapacityState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <label htmlFor="reservas-capacity" className={labelClass}>
        Cupo
      </label>
      <div className="flex items-center gap-2">
        <input
          id="reservas-capacity"
          name="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          step={1}
          defaultValue={capacity ?? ""}
          placeholder="Sin límite"
          aria-describedby="reservas-capacity-unit reservas-capacity-status"
          aria-invalid={state.error ? true : undefined}
          className={`${inputClass} max-w-[9rem]`}
        />
        <span id="reservas-capacity-unit" className="text-sm text-dd-black/65">
          asientos
        </span>
        <button type="submit" disabled={isPending} className={secondaryBtn}>
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <p
        id="reservas-capacity-status"
        aria-live="polite"
        className={`min-h-[1.125rem] text-[13px] font-medium leading-snug ${
          state.error ? "text-dd-red" : "text-dd-black/65"
        }`}
      >
        {isPending ? "" : state.error ?? (state.ok ? "Guardado." : "")}
      </p>
    </form>
  );
}
