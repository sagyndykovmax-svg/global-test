import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTemplate } from "@/templates/registry";
import { renderDocx, type DeclarationData } from "@/lib/docx";
import { saveDocx } from "@/lib/storage";
import { notifyTelegram } from "@/lib/telegram";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("[submit] unhandled error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

async function handle(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slug, data } = body as { slug?: unknown; data?: unknown };
  if (typeof slug !== "string") {
    return NextResponse.json({ error: "Missing template slug" }, { status: 400 });
  }

  const template = getTemplate(slug);
  if (!template) {
    return NextResponse.json({ error: "Unknown template slug" }, { status: 404 });
  }

  const parsed = template.schema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.entries(flat.fieldErrors)
      .find(([, msgs]) => msgs && msgs.length > 0);
    const summary = firstFieldError
      ? `${firstFieldError[0]}: ${firstFieldError[1]?.[0]}`
      : flat.formErrors[0] ?? "validation failed";
    return NextResponse.json(
      { error: `Заполните поля корректно (${summary})`, details: flat },
      { status: 400 },
    );
  }

  const application = await prisma.application.create({
    data: {
      templateSlug: slug,
      status: "submitted",
      data: JSON.stringify(parsed.data),
    },
  });

  let docxRelPath: string | null = null;
  let docxBuffer: Buffer | null = null;
  try {
    docxBuffer = await renderDocx(template.docxPath, parsed.data as DeclarationData);
    docxRelPath = await saveDocx(application.id, "draft", docxBuffer);
    await prisma.application.update({
      where: { id: application.id },
      data: { generatedFile: docxRelPath },
    });
  } catch (err) {
    console.error("[submit] docx generation failed:", err);
    // Application is still saved; admin can re-generate manually.
  }

  // Fire-and-forget notifications (errors are logged inside, not thrown)
  const applicantEmail = typeof (parsed.data as Record<string, unknown>).applicant_email === "string"
    ? ((parsed.data as Record<string, unknown>).applicant_email as string)
    : undefined;

  const message =
    `Новая заявка на ${template.title}\n` +
    `ID: ${application.id}\n` +
    (applicantEmail ? `Email клиента: ${applicantEmail}\n` : "") +
    `Открыть: ${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/admin/${application.id}`;

  await notifyTelegram(
    message,
    docxBuffer ? { filename: `application-${application.id}.docx`, buffer: docxBuffer } : undefined,
  );

  const notifyTo = (process.env.NOTIFY_EMAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (notifyTo.length) {
    await sendEmail({
      to: notifyTo.join(","),
      subject: `Новая заявка: ${template.title}`,
      text: message,
      attachments: docxBuffer
        ? [{ filename: `application-${application.id}.docx`, content: docxBuffer }]
        : undefined,
    });
  }

  // Note: clients do NOT receive an email — notifications go only to the manager
  // (NOTIFY_EMAIL_TO) and to the Telegram bot (TELEGRAM_CHAT_ID).

  return NextResponse.json({ id: application.id });
}
