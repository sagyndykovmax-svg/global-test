import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { readDocx } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "final" ? "final" : "draft";

  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const relPath = kind === "final" ? app.finalFile : app.generatedFile;
  if (!relPath) {
    return NextResponse.json({ error: "File not generated yet" }, { status: 404 });
  }

  const buf = await readDocx(relPath);
  const filename = `${app.templateSlug}-${kind}-${app.number ?? app.id.slice(0, 8)}.docx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
