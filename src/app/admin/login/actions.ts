"use server";

import { headers } from "next/headers";

import { buildLoginEmail, loginLink, loginOrigin } from "@/lib/admin-login";
import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";

export type LoginState = {
  status: "idle" | "sent" | "error";
  email: string;
  error?: string;
};

export async function requestMagicLink(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      status: "error",
      email,
      error:
        "El acceso al CMS todavía no está configurado. Añade Supabase Auth en Vercel.",
    };
  }

  if (!email) {
    return { status: "error", email, error: "Ingresa tu correo electrónico." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", email, error: "Escribe un correo válido." };
  }

  const h = await headers();
  const origin = loginOrigin(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto"),
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );

  // Production: we make the link ourselves and send it with Resend. It works
  // in any browser and skips Supabase's built-in email limit (a few per hour).
  if (hasServiceConfig && process.env.RESEND_API_KEY) {
    const sent = await sendAdminLink(email.toLowerCase(), origin);
    return sent
      ? { status: "sent", email }
      : {
          status: "error",
          email,
          error: "No pudimos enviar el enlace. Intenta de nuevo en unos minutos.",
        };
  }

  // Local dev and previews: Supabase sends the email (Mailpit locally).
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/admin`,
    },
  });

  if (error) {
    return {
      status: "error",
      email,
      error: "No pudimos enviar el enlace. Intenta de nuevo en unos minutos.",
    };
  }

  return { status: "sent", email };
}

/** Sends a sign-in link only to allowlisted admins. Others get the same
 * "sent" screen, so the form never reveals who is an admin. */
async function sendAdminLink(email: string, origin: string): Promise<boolean> {
  const db = getServiceClient();
  const { data: admin, error: lookupError } = await db
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    console.error("admin login lookup failed", lookupError.message);
    return false;
  }
  if (!admin) return true;

  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    console.error("admin login generateLink failed", error?.message);
    return false;
  }

  const link = loginLink(origin, data.properties.hashed_token);
  return (await sendEmail(buildLoginEmail(email, link))) === "sent";
}
