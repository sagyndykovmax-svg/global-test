import Link from "next/link";
import { listTemplates } from "@/templates/registry";

export default function HomePage() {
  const templates = listTemplates();
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold">Декларации и сертификаты соответствия</h1>
        <p className="mt-2 text-muted-foreground">
          Выберите тип документа, заполните данные и получите готовый макет на email и в Telegram.
        </p>
      </header>

      <section className="grid gap-4">
        {templates.map((t) => (
          <Link
            key={t.slug}
            href={`/apply/${t.slug}`}
            className="rounded-lg border border-border p-6 transition-colors hover:bg-accent"
          >
            <h2 className="text-lg font-medium">{t.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            <p className="mt-3 text-sm font-medium text-primary">Заполнить заявку →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
