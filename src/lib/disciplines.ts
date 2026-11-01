// Design disciplines for the WhatsApp sign-up and the RSVP form. Pure: client
// components import it. The DB stores the `value`, so a label can change
// freely; removing a value leaves old rows showing the raw key.

export const DISCIPLINES = [
  { value: "grafico", label: "Diseño gráfico" },
  { value: "branding", label: "Branding / identidad" },
  { value: "ux-ui", label: "UX/UI" },
  { value: "producto-digital", label: "Producto digital" },
  { value: "industrial", label: "Diseño industrial" },
  { value: "interiores", label: "Interiores" },
  { value: "arquitectura", label: "Arquitectura" },
  { value: "moda", label: "Moda" },
  { value: "ilustracion", label: "Ilustración" },
  { value: "motion", label: "Motion / animación" },
  { value: "fotografia", label: "Fotografía" },
  { value: "direccion-de-arte", label: "Dirección de arte / publicidad" },
  { value: "editorial", label: "Editorial" },
  { value: "tipografia", label: "Tipografía" },
  { value: "servicios", label: "Diseño de servicios" },
  { value: "estudiante", label: "Estudiante de diseño" },
  { value: "educador", label: "Educador/a de diseño" },
  { value: "otra", label: "Otra" },
] as const;

export type Discipline = (typeof DISCIPLINES)[number]["value"];

export const OTHER_DISCIPLINE: Discipline = "otra";
export const MAX_DISCIPLINE_OTHER = 80;

const LABELS = new Map<string, string>(DISCIPLINES.map((d) => [d.value, d.label]));

export function isDiscipline(value: string): value is Discipline {
  return LABELS.has(value);
}

/** What admins and spreadsheets read: the label, or the visitor's own words
 *  for "Otra". Blank for rows saved before the question existed. */
export function disciplineLabel(discipline: string | null, other: string | null): string {
  if (!discipline) return "";
  if (discipline === OTHER_DISCIPLINE) return other ? `Otra: ${other}` : "Otra";
  return LABELS.get(discipline) ?? discipline;
}

export type DisciplineErrors = { discipline?: string; disciplineOther?: string };

export type ParsedDiscipline =
  | { ok: true; discipline: Discipline; disciplineOther: string | null }
  | { ok: false; errors: DisciplineErrors };

export function parseDisciplineInput(input: { discipline: unknown; disciplineOther: unknown }): ParsedDiscipline {
  const discipline = String(input.discipline ?? "").trim();
  const other = String(input.disciplineOther ?? "").trim().replace(/\s+/g, " ");

  if (!discipline) return { ok: false, errors: { discipline: "Escoge tu disciplina." } };
  if (!isDiscipline(discipline)) return { ok: false, errors: { discipline: "Escoge una disciplina de la lista." } };
  if (discipline !== OTHER_DISCIPLINE) return { ok: true, discipline, disciplineOther: null };

  if (!other) return { ok: false, errors: { disciplineOther: "Cuéntanos cuál es tu disciplina." } };
  if (other.length > MAX_DISCIPLINE_OTHER) {
    return { ok: false, errors: { disciplineOther: "Usa 80 letras o menos." } };
  }
  // Control characters (NUL, escapes…); kept local so this module stays dependency-free.
  if (/[\u0000-\u001F\u007F]/.test(other)) {
    return { ok: false, errors: { disciplineOther: "Tiene caracteres que no se permiten." } };
  }
  return { ok: true, discipline, disciplineOther: other };
}
