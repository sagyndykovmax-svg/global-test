import { notFound } from "next/navigation";
import { getTemplate } from "@/templates/registry";
import { ApplicationForm } from "./form";

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  // Pass only serialisable fields to the client form (no Zod schema, no derive fn)
  const formConfig = {
    slug: template.slug,
    title: template.title,
    description: template.description,
    sections: template.sections,
    derivedFields: template.derivedFields,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <a href="/" className="text-sm text-muted-foreground hover:underline">
        ← К списку документов
      </a>
      <h1 className="mt-4 text-2xl font-semibold">{template.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
      <div className="mt-8">
        <ApplicationForm config={formConfig} />
      </div>
    </main>
  );
}
