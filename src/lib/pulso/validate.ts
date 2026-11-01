// Pure rules for the Pulso interest form — no network, no Next, no Node
// built-ins. The form (client) and the server action both import this file,
// so their checks never drift apart. Errors are codes, not text: the page
// shows them in the visitor's language.
import { EMAIL_RE } from "@/lib/rsvp";

export const PULSO_ROLES = ["metodo", "academia", "auspicio", "difusion", "voluntariado", "encuesta"] as const;
export type PulsoRole = (typeof PULSO_ROLES)[number];

export type PulsoLang = "es" | "en";

export const LIMITS = { name: 120, email: 254, organization: 160, message: 2000 } as const;
export const INTEREST_PER_DAY = 5;

export type PulsoRaw = {
  name: string;
  email: string;
  organization: string;
  roles: string[];
  message: string;
  consent: boolean;
  lang: string;
};

export type PulsoInput = {
  name: string;
  email: string;
  organization: string | null;
  roles: PulsoRole[];
  message: string | null;
  lang: PulsoLang;
};

export type PulsoErrorCode = "required" | "invalid" | "tooLong";
export type PulsoFieldErrors = Partial<Record<"name" | "email" | "organization" | "roles" | "message" | "consent", PulsoErrorCode>>;

export type PulsoParse = { ok: true; value: PulsoInput } | { ok: false; errors: PulsoFieldErrors };

export function isPulsoRole(value: string): value is PulsoRole {
  return (PULSO_ROLES as readonly string[]).includes(value);
}

export function parseLang(value: unknown): PulsoLang {
  return value === "en" ? "en" : "es";
}

export function pulsoRawFromFormData(formData: FormData): PulsoRaw {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    organization: String(formData.get("organization") ?? ""),
    roles: formData.getAll("role").map(String),
    message: String(formData.get("message") ?? ""),
    consent: formData.get("consent") === "on",
    lang: String(formData.get("lang") ?? ""),
  };
}

export function parsePulsoInput(raw: PulsoRaw): PulsoParse {
  const errors: PulsoFieldErrors = {};
  const name = raw.name.trim();
  const email = raw.email.trim().toLowerCase();
  const organization = raw.organization.trim();
  const message = raw.message.trim();
  // Unknown values are dropped; a repeated value counts once.
  const roles = [...new Set(raw.roles.filter(isPulsoRole))];

  if (!name) errors.name = "required";
  else if (name.length > LIMITS.name) errors.name = "tooLong";

  if (!email) errors.email = "required";
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) errors.email = "invalid";

  if (organization.length > LIMITS.organization) errors.organization = "tooLong";
  if (roles.length === 0) errors.roles = "required";
  if (message.length > LIMITS.message) errors.message = "tooLong";
  if (!raw.consent) errors.consent = "required";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      email,
      organization: organization || null,
      roles,
      message: message || null,
      lang: parseLang(raw.lang),
    },
  };
}
