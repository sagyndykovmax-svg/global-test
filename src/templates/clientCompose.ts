/**
 * Client-side derive registry. Maps template slugs to pure functions that compute
 * derived fields from current form values. Used by the public form to live-update
 * read-only/computed fields as the user types.
 *
 * Server side calls `template.derive` from the registry directly — but since
 * TemplateDefinition includes the schema (zod), it can't safely cross the
 * server/client boundary as a single object. So we expose just the compose
 * functions here for the form to import.
 */
import { composeDeclaration, deriveTnVedCode, type ComposeArgs, type ItemGender } from "./declaration-eaeu-light/compose";

export type ClientDeriveFn = (data: Record<string, unknown>) => Record<string, string>;

export const clientDerivers: Record<string, ClientDeriveFn | undefined> = {
  "declaration-eaeu-light": (data) =>
    composeDeclaration({
      products: (data.products as ComposeArgs["products"]) ?? [],
      brand_name: typeof data.brand_name === "string" ? data.brand_name : "",
    }),
};

/**
 * Per-item derive functions for list-type fields.
 *   Keyed by template slug → list-field name → function(item) returning a partial item update.
 * Used by the form to auto-update fields like tn_ved_code as the user types name/composition/type/gender.
 */
export type ItemDeriveFn = (item: Record<string, unknown>) => Record<string, string>;

const VALID_GENDERS = new Set<ItemGender>(["auto", "women", "men", "kids", "adults"]);

export const clientItemDerivers: Record<string, Record<string, ItemDeriveFn | undefined> | undefined> = {
  "declaration-eaeu-light": {
    products: (item) => ({
      tn_ved_code: deriveTnVedCode({
        product_name: typeof item.product_name === "string" ? item.product_name : "",
        product_composition: typeof item.product_composition === "string" ? item.product_composition : "",
        production_type: item.production_type === "knit" ? "knit" : "woven",
        gender_hint:
          typeof item.gender_hint === "string" && VALID_GENDERS.has(item.gender_hint as ItemGender)
            ? (item.gender_hint as ItemGender)
            : "auto",
      }),
    }),
  },
};
