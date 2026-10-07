// Error logging for La Vitrina server code. A PostgrestError's `details` (and
// sometimes `hint`) can echo the failing row — "Failing row contains (…)" —
// with creator_email and ip_hash, so only the code and message are logged.
import "server-only";

export type SafeError = { code?: string; message: string };

export function safeError(error: unknown): SafeError {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return {
      ...(typeof code === "string" || typeof code === "number" ? { code: String(code) } : {}),
      message: typeof message === "string" ? message : "unknown error",
    };
  }
  return { message: typeof error === "string" ? error : "unknown error" };
}

export function logSafe(label: string, error: unknown): void {
  console.error(label, safeError(error));
}
