import nodemailer from "nodemailer";

let cached: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return cached;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.warn("[email] skipped — SMTP_HOST not set");
    return;
  }
  const from = process.env.SMTP_FROM ?? "noreply@example.com";
  try {
    await transport.sendMail({ from, ...opts });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}
