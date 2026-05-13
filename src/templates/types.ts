import type { z } from "zod";

export type FieldKind = "text" | "textarea" | "email" | "tel" | "list" | "select";

export type SelectOption = { value: string; label: string };

export type ListItemFieldDef =
  | {
      name: string;
      label: string;
      kind: Exclude<FieldKind, "list" | "select">;
      placeholder?: string;
      derived?: boolean;
      help?: string;
    }
  | {
      name: string;
      label: string;
      kind: "select";
      options: SelectOption[];
      help?: string;
    };

export type FormFieldDef =
  | {
      name: string;
      label: string;
      kind: Exclude<FieldKind, "list" | "select">;
      placeholder?: string;
      help?: string;
    }
  | {
      name: string;
      label: string;
      kind: "select";
      options: SelectOption[];
      help?: string;
    }
  | {
      name: string;
      label: string;
      kind: "list";
      itemLabel: string;        // e.g., "Товар"
      addButtonLabel: string;   // e.g., "Добавить товар"
      itemFields: ListItemFieldDef[];
      minItems?: number;
    };

export type FormSection = {
  title: string;
  description?: string;
  fields: FormFieldDef[];
};

export type AdminMetadataField = {
  name: string;
  label: string;
  kind: "text" | "date";
};

export type TemplateDefinition = {
  slug: string;
  title: string;             // Shown to clients
  description: string;
  docxPath: string;          // Relative to project root
  sections: FormSection[];
  /** Fields the admin fills after review (registration number, dates, protocol number). */
  adminMetadata: AdminMetadataField[];
  /** Zod schema validating the public form payload. */
  schema: z.ZodTypeAny;
  /**
   * Optional: derived/computed fields. The map keys are field names that the template
   * computes itself from other inputs. Used both client-side (live preview while the
   * user fills the form) and server-side (overwrite submitted values before rendering).
   */
  derivedFields?: string[];
  /**
   * Server-side derive — used to overwrite user-submitted values for derivedFields
   * before docx rendering, so the document always matches the template's own logic.
   */
  derive?: (data: Record<string, unknown>) => Record<string, string>;
};
