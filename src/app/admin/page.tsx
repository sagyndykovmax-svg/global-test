import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getTemplate } from "@/templates/registry";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Новая",
  in_review: "В работе",
  issued: "Выдана",
  rejected: "Отклонена",
};

export default async function AdminListPage() {
  if (!(await requireAdmin())) redirect("/admin/login");

  const apps = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Заявки</h1>
        <form action="/api/admin/logout" method="POST">
          <button className="text-sm text-muted-foreground hover:underline">Выйти</button>
        </form>
      </header>

      {apps.length === 0 ? (
        <p className="text-muted-foreground">Пока нет заявок.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Создана</th>
              <th className="py-2 pr-4">Тип</th>
              <th className="py-2 pr-4">Заявитель</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Статус</th>
              <th className="py-2">Рег. №</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => {
              const t = getTemplate(a.templateSlug);
              const data = JSON.parse(a.data) as Record<string, unknown>;
              return (
                <tr key={a.id} className="border-b border-border hover:bg-accent/50">
                  <td className="py-3 pr-4 font-mono text-xs">
                    <Link href={`/admin/${a.id}`} className="hover:underline">
                      {new Date(a.createdAt).toLocaleString("ru-RU")}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{t?.title.split("(")[0].trim() ?? a.templateSlug}</td>
                  <td className="py-3 pr-4">{String(data.applicant_full_name ?? "—")}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{String(data.applicant_email ?? "—")}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS_LABEL[a.status] ?? a.status}</span>
                  </td>
                  <td className="py-3 font-mono text-xs">{a.registrationNo ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
