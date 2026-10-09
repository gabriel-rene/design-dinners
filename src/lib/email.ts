// Sends one email through Resend's REST API. Never throws: an email problem
// must not break the action that triggered it. Without RESEND_API_KEY (local
// dev, tests) it skips quietly.
import "server-only";

export const EMAIL_FROM = "Design Dinners <hola@designdinners.com>";
/** designdinners.com has no inbox, so replies go here. */
export const EMAIL_REPLY_TO = "hola@gaborene.com";

const RESEND_URL = "https://api.resend.com/emails";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** `content` is plain text; it is base64-encoded for Resend here. */
  attachments?: { filename: string; content: string }[];
};

export type SendResult = "sent" | "skipped" | "failed";

export async function sendEmail(
  message: EmailMessage,
  opts: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<SendResult> {
  const apiKey = "apiKey" in opts ? opts.apiKey : process.env.RESEND_API_KEY;
  const fetchImpl = opts.fetchImpl ?? fetch;

  if (!apiKey) {
    console.warn("sendEmail skipped: RESEND_API_KEY is not set");
    return "skipped";
  }

  try {
    const response = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [message.to],
        reply_to: EMAIL_REPLY_TO,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((file) => ({
          filename: file.filename,
          content: Buffer.from(file.content, "utf8").toString("base64"),
        })),
      }),
    });
    if (!response.ok) {
      // Log the status and Resend's error only, never the recipient.
      console.error("sendEmail failed", response.status, (await response.text()).slice(0, 300));
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("sendEmail failed", error);
    return "failed";
  }
}
