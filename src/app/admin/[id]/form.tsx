"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminMetadataField } from "@/templates/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  applicationId: string;
  currentStatus: string;
  adminFields: AdminMetadataField[];
  currentValues: Record<string, string>;
  generatedFile: string | null;
  finalFile: string | null;
};

export function AdminDetailForm({
  applicationId,
  currentStatus,
  adminFields,
  currentValues,
  generatedFile,
  finalFile,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(currentValues);
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(action: "save" | "save_and_regenerate") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, status, action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Не удалось сохранить");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold">Регистрация и финальный документ</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {adminFields.map((f) => (
          <div key={f.name}>
            <Label htmlFor={`admin-${f.name}`}>{f.label}</Label>
            <Input
              id={`admin-${f.name}`}
              type={f.kind === "date" ? "date" : "text"}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="mt-1.5"
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <Label htmlFor="admin-status">Статус</Label>
          <select
            id="admin-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1.5 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="submitted">Новая</option>
            <option value="in_review">В работе</option>
            <option value="issued">Выдана</option>
            <option value="rejected">Отклонена</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="admin-notes">Заметки</Label>
          <Textarea
            id="admin-notes"
            value={values.notes ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            className="mt-1.5"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => save("save")} disabled={saving}>
          Сохранить
        </Button>
        <Button onClick={() => save("save_and_regenerate")} disabled={saving} variant="secondary">
          Сохранить и перегенерировать DOCX
        </Button>
        {generatedFile && (
          <a
            href={`/api/admin/applications/${applicationId}/file?kind=draft`}
            className="inline-flex h-10 items-center rounded-md bg-muted px-4 text-sm font-medium hover:bg-muted/80"
          >
            Скачать черновик
          </a>
        )}
        {finalFile && (
          <a
            href={`/api/admin/applications/${applicationId}/file?kind=final`}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Скачать финальный документ
          </a>
        )}
      </div>
    </section>
  );
}
