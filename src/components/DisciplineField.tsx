"use client";

import { forwardRef, useState } from "react";

import { DISCIPLINES, MAX_DISCIPLINE_OTHER, OTHER_DISCIPLINE } from "@/lib/disciplines";

type Props = {
  idPrefix: string;
  defaultDiscipline: string;
  defaultOther: string;
  errors: { discipline?: string; disciplineOther?: string };
  /** Field label, e.g. "¿Qué haces?". Rendered by the caller's style. */
  labelClassName: string;
  /** Control classes; the boolean says whether this control has an error. */
  controlClassName: (invalid: boolean) => string;
  renderError: (id: string, message?: string) => React.ReactNode;
  required?: React.ReactNode;
};

/** The discipline dropdown, plus a text box when the visitor picks "Otra".
 *  Shared by the WhatsApp sign-up and the RSVP form so both ask the same way.
 *  The forwarded ref is the select (for focus on error). */
const DisciplineField = forwardRef<HTMLSelectElement, Props>(function DisciplineField(
  { idPrefix, defaultDiscipline, defaultOther, errors, labelClassName, controlClassName, renderError, required },
  ref,
) {
  const [value, setValue] = useState(defaultDiscipline);
  const selectId = `${idPrefix}-discipline`;
  const otherId = `${idPrefix}-discipline-other`;
  const isOther = value === OTHER_DISCIPLINE;

  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={selectId} className={labelClassName}>
          Tu disciplina{required}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            name="discipline"
            required
            // Uncontrolled on purpose: React resets the form after each submit,
            // and a reset select returns to its defaultValue (the parent
            // re-keys this field with what was sent).
            defaultValue={defaultDiscipline}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={errors.discipline ? true : undefined}
            aria-describedby={errors.discipline ? `${selectId}-error` : undefined}
            className={`${controlClassName(Boolean(errors.discipline))} appearance-none pr-11 ${value ? "" : "text-dd-black/60"}`}
          >
            <option value="" disabled>
              Escoge una
            </option>
            {DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value} className="text-dd-black">
                {d.label}
              </option>
            ))}
          </select>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-dd-black"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        {renderError(`${selectId}-error`, errors.discipline)}
      </div>

      {isOther && (
        <div className="flex flex-col gap-2">
          <label htmlFor={otherId} className={labelClassName}>
            ¿Cuál?{required}
          </label>
          <input
            id={otherId}
            name="discipline_other"
            type="text"
            required
            maxLength={MAX_DISCIPLINE_OTHER}
            defaultValue={defaultOther}
            placeholder="Ej. diseño de experiencias"
            aria-invalid={errors.disciplineOther ? true : undefined}
            aria-describedby={errors.disciplineOther ? `${otherId}-error` : undefined}
            className={controlClassName(Boolean(errors.disciplineOther))}
          />
          {renderError(`${otherId}-error`, errors.disciplineOther)}
        </div>
      )}
    </>
  );
});

export default DisciplineField;
