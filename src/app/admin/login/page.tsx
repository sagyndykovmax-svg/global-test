import { redirect } from "next/navigation";
import { getSession, checkCredentials } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function loginAction(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!checkCredentials(username, password)) {
    redirect("/admin/login?error=1");
  }
  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  redirect("/admin");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Вход в админку</h1>
      <form action={loginAction} className="space-y-4">
        <div>
          <Label htmlFor="username">Логин</Label>
          <Input id="username" name="username" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" name="password" type="password" required className="mt-1.5" />
        </div>
        {error && <p className="text-sm text-red-600">Неверный логин или пароль</p>}
        <Button type="submit">Войти</Button>
      </form>
    </main>
  );
}
