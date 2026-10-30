import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { hashPassword, isOwnerUsername, requireOwner } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const MIN_PASSWORD_LENGTH = 8;

const ERROR_LABEL: Record<string, string> = {
  username: "Укажите логин",
  password: `Пароль — минимум ${MIN_PASSWORD_LENGTH} символов`,
  taken: "Такой логин уже занят",
};

async function addStaffAction(formData: FormData) {
  "use server";
  if (!(await requireOwner())) redirect("/admin/login");

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username) redirect("/admin/staff?error=username");
  if (password.length < MIN_PASSWORD_LENGTH) redirect("/admin/staff?error=password");

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing || isOwnerUsername(username)) redirect("/admin/staff?error=taken");

  await prisma.user.create({ data: { username, passwordHash: await hashPassword(password) } });
  redirect("/admin/staff");
}

async function setStaffActiveAction(formData: FormData) {
  "use server";
  if (!(await requireOwner())) redirect("/admin/login");

  await prisma.user.update({
    where: { id: String(formData.get("id")) },
    data: { active: formData.get("active") === "1" },
  });
  revalidatePath("/admin/staff");
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await requireOwner())) redirect("/admin");

  const { error } = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Все заявки
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Сотрудники</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Сотрудники видят и обрабатывают заявки, но не управляют доступом.
      </p>

      <section className="mt-8 rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Добавить сотрудника</h2>
        <form action={addStaffAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="username">Логин</Label>
            <Input id="username" name="username" required autoComplete="off" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="mt-1.5"
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{ERROR_LABEL[error] ?? "Не удалось добавить"}</p>}
          <div className="sm:col-span-2">
            <Button type="submit">Добавить</Button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        {users.length === 0 ? (
          <p className="text-muted-foreground">Сотрудников пока нет.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Логин</th>
                <th className="py-2 pr-4">Добавлен</th>
                <th className="py-2 pr-4">Доступ</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border">
                  <td className="py-3 pr-4">{u.username}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="py-3 pr-4">{u.active ? "Есть" : "Отключён"}</td>
                  <td className="py-3 text-right">
                    <form action={setStaffActiveAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                      <Button type="submit" size="sm" variant={u.active ? "destructive" : "secondary"}>
                        {u.active ? "Отключить" : "Включить"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
