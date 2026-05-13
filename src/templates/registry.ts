import { declarationEaeuLight } from "./declaration-eaeu-light/schema";
import type { TemplateDefinition } from "./types";

const all: TemplateDefinition[] = [declarationEaeuLight];

export const templates: Record<string, TemplateDefinition> = Object.fromEntries(
  all.map((t) => [t.slug, t]),
);

export function getTemplate(slug: string): TemplateDefinition | undefined {
  return templates[slug];
}

export function listTemplates(): TemplateDefinition[] {
  return all;
}
