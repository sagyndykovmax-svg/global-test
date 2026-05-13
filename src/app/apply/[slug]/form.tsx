"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import type { FormSection, FormFieldDef, ListItemFieldDef } from "@/templates/types";
import { clientDerivers, clientItemDerivers } from "@/templates/clientCompose";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Config = {
  slug: string;
  title: string;
  description: string;
  sections: FormSection[];
  derivedFields?: string[];
};

export function ApplicationForm({ config }: { config: Config }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm<Record<string, unknown>>({
    defaultValues: buildDefaults(config.sections),
  });

  // ---- Top-level live derive (description, ГОСТы, has_appendix etc.) ----
  const deriveFn = clientDerivers[config.slug];
  const lastDerivedRef = useRef<Record<string, string>>({});
  // ---- Per-item live derive (e.g. tn_ved_code from name+composition+type) ----
  const itemDerivers = clientItemDerivers[config.slug] ?? {};
  // Track last auto-computed value per item field, keyed as "{fieldName}.{idx}.{subName}"
  const lastItemDerivedRef = useRef<Record<string, string>>({});
  // ---- LLM-based TN VED refinement (debounced, async) ----
  // Status per item index: "idle" | "loading" | "llm" | "fallback"
  const [tnvedStatus, setTnvedStatus] = useState<Record<number, "idle" | "loading" | "llm" | "llm-eaeu-refined" | "fallback" | "manual">>({});
  const llmDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lastLlmInputRef = useRef<Record<number, string>>({});

  const allValues = watch();

  useEffect(() => {
    // Top-level fields
    if (deriveFn) {
      const derived = deriveFn(allValues);
      for (const [field, newValue] of Object.entries(derived)) {
        const current = String(getValues(field) ?? "");
        if (current === "" || current === lastDerivedRef.current[field]) {
          setValue(field, newValue, { shouldDirty: false });
          lastDerivedRef.current[field] = newValue;
        }
      }
    }

    // Per-item fields (lists with item-level derivers — rule-based, instant)
    for (const [listName, itemDeriveFn] of Object.entries(itemDerivers)) {
      if (!itemDeriveFn) continue;
      const items = allValues[listName];
      if (!Array.isArray(items)) continue;
      items.forEach((item: unknown, idx: number) => {
        if (!item || typeof item !== "object") return;
        const derived = itemDeriveFn(item as Record<string, unknown>);
        for (const [subName, newValue] of Object.entries(derived)) {
          if (!newValue) continue;
          const path = `${listName}.${idx}.${subName}`;
          const current = String(getValues(path) ?? "");
          if (current === "" || current === lastItemDerivedRef.current[path]) {
            setValue(path, newValue, { shouldDirty: false });
            lastItemDerivedRef.current[path] = newValue;
          }
        }
      });
    }

    // LLM refinement for ТН ВЭД (only for products list with name+composition filled)
    if (config.slug === "declaration-eaeu-light") {
      const items = (allValues.products as Array<Record<string, unknown>>) ?? [];
      items.forEach((item, idx) => {
        const name = typeof item.product_name === "string" ? item.product_name.trim() : "";
        const composition = typeof item.product_composition === "string" ? item.product_composition.trim() : "";
        if (!name || !composition) return;

        const inputKey = JSON.stringify({
          name,
          composition,
          type: item.production_type,
          gender: item.gender_hint,
        });
        if (lastLlmInputRef.current[idx] === inputKey) return; // already requested this exact input

        // Debounce 700ms after last change
        if (llmDebounceRef.current[idx]) clearTimeout(llmDebounceRef.current[idx]);
        llmDebounceRef.current[idx] = setTimeout(async () => {
          lastLlmInputRef.current[idx] = inputKey;
          setTnvedStatus((s) => ({ ...s, [idx]: "loading" }));
          try {
            const res = await fetch("/api/tnved-suggest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product_name: name,
                product_composition: composition,
                production_type: item.production_type,
                gender_hint: item.gender_hint,
              }),
            });
            if (!res.ok) {
              setTnvedStatus((s) => ({ ...s, [idx]: "fallback" }));
              return;
            }
            const data = await res.json() as { code?: string; source?: "llm" | "fallback" };
            if (!data.code) {
              setTnvedStatus((s) => ({ ...s, [idx]: "fallback" }));
              return;
            }
            // Update only if user hasn't manually edited the code
            const path = `products.${idx}.tn_ved_code`;
            const current = String(getValues(path) ?? "");
            const lastRuleBased = lastItemDerivedRef.current[path] ?? "";
            if (current === "" || current === lastRuleBased) {
              setValue(path, data.code, { shouldDirty: false });
              lastItemDerivedRef.current[path] = data.code;
              setTnvedStatus((s) => ({ ...s, [idx]: data.source ?? "fallback" }));
            } else {
              // User has manually overridden — keep their value, mark as manual
              setTnvedStatus((s) => ({ ...s, [idx]: "manual" }));
            }
          } catch {
            setTnvedStatus((s) => ({ ...s, [idx]: "fallback" }));
          }
        }, 700);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allValues)]);

  const onSubmit = handleSubmit(async (data) => {
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: config.slug, data }),
      });
      const text = await res.text();
      let json: { id?: string; error?: string } | null = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        const detail = json?.error
          ? json.error
          : text
            ? text.slice(0, 300)
            : `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""} (пустой ответ)`;
        setErrorMsg(`Ошибка отправки: ${detail}`);
        setStatus("error");
        return;
      }
      if (!json?.id) {
        setErrorMsg("Сервер не вернул ID заявки. Проверьте логи приложения.");
        setStatus("error");
        return;
      }
      setApplicationId(json.id);
      setStatus("success");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  });

  if (status === "success") {
    return (
      <div className="rounded-lg border border-border bg-accent/30 p-6">
        <h2 className="text-lg font-semibold">Заявка отправлена</h2>
        <p className="mt-2 text-sm">
          Номер заявки: <code className="font-mono">{applicationId}</code>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Заявка передана менеджеру. Мы свяжемся с вами в ближайшее время.
        </p>
        <a href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← На главную
        </a>
      </div>
    );
  }

  const derivedSet = new Set(config.derivedFields ?? []);

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {config.sections.map((section) => (
        <section key={section.title} className="rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.description && (
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
          )}
          <div className="mt-4 space-y-4">
            {section.fields.map((field) => {
              if (field.kind === "list") {
                return <ListField key={field.name} field={field} control={control} register={register} tnvedStatus={field.name === "products" ? tnvedStatus : undefined} />;
              }
              if (field.kind === "select") {
                return <SelectField key={field.name} field={field} register={register} />;
              }
              return (
                <ScalarField
                  key={field.name}
                  field={field}
                  register={register}
                  errors={errors}
                  isDerived={derivedSet.has(field.name)}
                />
              );
            })}
          </div>
        </section>
      ))}

      {errorMsg && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{errorMsg}</div>
      )}

      <Button type="submit" disabled={status === "submitting"} size="md">
        {status === "submitting" ? "Отправка…" : "Отправить заявку"}
      </Button>
    </form>
  );
}

function buildDefaults(sections: FormSection[]) {
  const out: Record<string, unknown> = {};
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.kind === "list") {
        out[f.name] = [buildEmptyItem(f.itemFields)];
      } else if (f.kind === "select") {
        out[f.name] = f.options[0]?.value ?? "";
      } else {
        out[f.name] = "";
      }
    }
  }
  return out;
}

function buildEmptyItem(itemFields: ListItemFieldDef[]): Record<string, string> {
  const item: Record<string, string> = {};
  for (const sub of itemFields) {
    if (sub.kind === "select") {
      item[sub.name] = sub.options[0]?.value ?? "";
    } else {
      item[sub.name] = "";
    }
  }
  return item;
}

function ScalarField({
  field,
  register,
  errors,
  isDerived,
}: {
  field: Exclude<FormFieldDef, { kind: "list" | "select" }>;
  register: ReturnType<typeof useForm>["register"];
  errors: Record<string, { message?: string } | undefined>;
  isDerived?: boolean;
}) {
  const id = `field-${field.name}`;
  const error = errors[field.name];
  const inputType = field.kind === "email" ? "email" : field.kind === "tel" ? "tel" : "text";
  const derivedClass = isDerived ? "bg-muted/40" : "";
  return (
    <div>
      <Label htmlFor={id}>
        {field.label}
        {isDerived && <span className="ml-2 text-xs font-normal text-muted-foreground">(автозаполнение)</span>}
      </Label>
      {field.kind === "textarea" ? (
        <Textarea id={id} placeholder={field.placeholder} className={`mt-1.5 ${derivedClass}`} {...register(field.name)} />
      ) : (
        <Input id={id} type={inputType} placeholder={field.placeholder} className={`mt-1.5 ${derivedClass}`} {...register(field.name)} />
      )}
      {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      {error?.message && <p className="mt-1 text-xs text-red-600">{String(error.message)}</p>}
    </div>
  );
}

function SelectField({
  field,
  register,
}: {
  field: Extract<FormFieldDef, { kind: "select" }>;
  register: ReturnType<typeof useForm>["register"];
}) {
  const id = `field-${field.name}`;
  return (
    <div>
      <Label htmlFor={id}>{field.label}</Label>
      <select
        id={id}
        className="mt-1.5 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        {...register(field.name)}
      >
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
    </div>
  );
}

function ListField({
  field,
  control,
  register,
  tnvedStatus,
}: {
  field: Extract<FormFieldDef, { kind: "list" }>;
  control: ReturnType<typeof useForm>["control"];
  register: ReturnType<typeof useForm>["register"];
  tnvedStatus?: Record<number, "idle" | "loading" | "llm" | "llm-eaeu-refined" | "fallback" | "manual">;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: field.name });
  const statusForIdx = (idx: number) => tnvedStatus?.[idx];

  return (
    <div>
      <Label>{field.label}</Label>
      <div className="mt-2 space-y-3">
        {fields.map((row, idx) => (
          <div key={row.id} className="rounded-md border border-border bg-muted/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {field.itemLabel} {idx + 1}
              </span>
              {fields.length > (field.minItems ?? 1) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                  Удалить
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {field.itemFields.map((sub) => {
                const path = `${field.name}.${idx}.${sub.name}`;
                if (sub.kind === "select") {
                  return (
                    <div key={sub.name}>
                      <Label htmlFor={path} className="text-xs">
                        {sub.label}
                      </Label>
                      <select
                        id={path}
                        className="mt-1 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                        {...register(path)}
                      >
                        {sub.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {sub.help && <p className="mt-1 text-xs text-muted-foreground">{sub.help}</p>}
                    </div>
                  );
                }
                const isDerived = sub.derived === true;
                // Show LLM status for tn_ved_code field (when known)
                const llmStatus = isDerived && sub.name === "tn_ved_code"
                  ? statusForIdx(idx)
                  : undefined;
                const statusBadge = llmStatus === "loading"
                  ? <span className="ml-2 text-[10px] font-normal italic text-amber-600">проверяется по справочнику ЕАЭС…</span>
                  : (llmStatus === "llm" || llmStatus === "llm-eaeu-refined")
                    ? <span className="ml-2 text-[10px] font-normal italic text-emerald-700">подобран по справочнику ЕАЭС</span>
                    : llmStatus === "manual"
                      ? <span className="ml-2 text-[10px] font-normal italic text-blue-600">✏ введено вручную</span>
                      : null;
                return (
                  <div key={sub.name}>
                    <Label htmlFor={path} className="text-xs">
                      {sub.label}
                      {isDerived && <span className="ml-2 font-normal text-muted-foreground">(автозаполнение)</span>}
                      {statusBadge}
                    </Label>
                    <Input
                      id={path}
                      placeholder={sub.placeholder}
                      className={`mt-1 ${isDerived ? "bg-background/60" : ""}`}
                      {...register(path)}
                    />
                    {sub.help && <p className="mt-1 text-xs text-muted-foreground">{sub.help}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => append(buildEmptyItem(field.itemFields))}
      >
        + {field.addButtonLabel}
      </Button>
    </div>
  );
}
