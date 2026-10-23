// Pieces of the admin magic-link email. The link carries a `token_hash`, so
// `/auth/callback` can verify it in ANY browser: the old PKCE `?code=` link
// only worked in the browser (and on the domain) that asked for it, which
// broke when the email opened in a mail app or on design-dinners.vercel.app.

/** Hosts a sign-in link may point back to. Anything else uses the fallback. */
const ALLOWED_HOSTS = [
  "designdinners.com",
  "www.designdinners.com",
  "design-dinners.vercel.app",
  "localhost",
  "127.0.0.1",
];

/** The origin the visitor is on, so the link returns them to the same site. */
export function loginOrigin(
  host: string | null,
  proto: string | null,
  fallback: string,
): string {
  // Rebuild the origin from checked parts only; never echo the raw header
  // (e.g. "designdinners.com:x@evil.com" would point the link at evil.com).
  const match = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/i.exec(host ?? "");
  if (!match) return fallback.replace(/\/$/, "");
  const hostname = match[1].toLowerCase();
  if (!ALLOWED_HOSTS.includes(hostname)) return fallback.replace(/\/$/, "");
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const scheme = isLocal && proto === "http" ? "http" : "https";
  const port = isLocal && match[2] ? `:${match[2]}` : "";
  return `${scheme}://${hostname}${port}`;
}

export function loginLink(origin: string, tokenHash: string): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type: "email", next: "/admin" });
  return `${origin}/auth/callback?${params}`;
}

export function buildLoginEmail(to: string, link: string) {
  return {
    to,
    subject: "Tu enlace para entrar al panel — Design Dinners",
    text: `Entra al panel de Design Dinners con este enlace:\n\n${link}\n\nEl enlace funciona una sola vez y vence en 1 hora. Si no lo pediste, ignora este correo.`,
    html: `<p>Entra al panel de Design Dinners:</p><p><a href="${link}" style="display:inline-block;background:#d21432;color:#f8e3ca;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Entrar al panel</a></p><p style="color:#555;font-size:14px">El enlace funciona una sola vez y vence en 1 hora. Si no lo pediste, ignora este correo.</p>`,
  };
}
