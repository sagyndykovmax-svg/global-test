import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { applicationLabel } from "@/lib/applications";
import { requireAdmin } from "@/lib/auth";
import { getTemplate } from "@/templates/registry";
import { AdminDetailForm } from "./form";

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) redirect("/admin/login");
  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) notFound();

  const template = getTemplate(app.templateSlug);
  if (!template) notFound();

  const data = JSON.parse(app.data) as Record<string, unknown>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Все заявки
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Заявка {applicationLabel(app)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {template.title} · создана {new Date(app.createdAt).toLocaleString("ru-RU")}
      </p>

      <section className="mt-8 rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Данные заявки</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {Object.entries(data).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="mt-0.5">
                {Array.isArray(v) ? (
                  <ul className="list-inside list-disc">
                    {(v as Record<string, string>[]).map((row, i) => (
                      <li key={i}>{Object.values(row).join(" · ")}</li>
                    ))}
                  </ul>
                ) : (
                  String(v ?? "—")
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <AdminDetailForm
        applicationId={app.id}
        currentStatus={app.status}
        adminFields={template.adminMetadata}
        currentValues={{
          registration_no: app.registrationNo ?? "",
          registered_at: app.registeredAt ? app.registeredAt.toISOString().slice(0, 10) : "",
          valid_until: app.validUntil ? app.validUntil.toISOString().slice(0, 10) : "",
          protocol_no: app.protocolNo ?? "",
          notes: app.notes ?? "",
        }}
        generatedFile={app.generatedFile}
        finalFile={app.finalFile}
      />
    </main>
  );
}
