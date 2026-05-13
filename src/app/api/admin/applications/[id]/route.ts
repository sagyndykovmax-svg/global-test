import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getTemplate } from "@/templates/registry";
import { renderDocx, type DeclarationData } from "@/lib/docx";
import { saveDocx } from "@/lib/storage";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const registrationNo = typeof body.registration_no === "string" && body.registration_no.trim()
    ? String(body.registration_no).trim()
    : null;
  const protocolNo = typeof body.protocol_no === "string" && body.protocol_no.trim()
    ? String(body.protocol_no).trim()
    : null;
  const registeredAt = typeof body.registered_at === "string" && body.registered_at
    ? new Date(body.registered_at)
    : null;
  const validUntil = typeof body.valid_until === "string" && body.valid_until
    ? new Date(body.valid_until)
    : null;
  const notes = typeof body.notes === "string" ? String(body.notes) : null;
  const status = typeof body.status === "string" ? body.status : app.status;

  let finalFile = app.finalFile;
  if (body.action === "save_and_regenerate") {
    const template = getTemplate(app.templateSlug);
    if (!template) {
      return NextResponse.json({ error: "Template removed" }, { status: 500 });
    }
    const data = JSON.parse(app.data) as DeclarationData;
    const enriched: DeclarationData = {
      ...data,
      registration_no: registrationNo ?? undefined,
      protocol_no: protocolNo ?? undefined,
      registered_at: registeredAt ? formatRu(registeredAt) : undefined,
      valid_until: validUntil ? formatRu(validUntil) : undefined,
    };
    const buf = await renderDocx(template.docxPath, enriched);
    finalFile = await saveDocx(app.id, "final", buf);
  }

  await prisma.application.update({
    where: { id },
    data: {
      registrationNo,
      registeredAt,
      validUntil,
      protocolNo,
      notes,
      status,
      finalFile,
    },
  });

  return NextResponse.json({ ok: true });
}

function formatRu(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}
