import { promises as fs } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export type ProductRow = {
  tn_ved_code: string;
  product_name: string;
  product_composition: string;
};

export type DeclarationData = {
  applicant_full_name: string;
  applicant_okpo: string;
  applicant_inn: string;
  applicant_country: string;
  applicant_address: string;
  applicant_phone: string;
  applicant_email: string;
  applicant_signatory: string;
  manufacturer_full_name: string;
  manufacturer_country: string;
  manufacturer_address: string;
  product_group_description: string;
  products: ProductRow[];

  // Derived fields used by the docx template (set by composer)
  product_group_intro?: string;
  gost_references_block?: string;
  has_appendix?: string;
  kod_tn_ved_line?: string;

  // Filled by admin (optional during initial submission)
  registration_no?: string;
  registered_at?: string;
  valid_until?: string;
  protocol_no?: string;
};

/**
 * Render a docx template with the given data. Returns the rendered file as a Buffer.
 *
 * `data.products` rows get an automatic `position` field (1-indexed) so the template
 * can show row numbers via {position}.
 */
export async function renderDocx(templatePath: string, data: DeclarationData): Promise<Buffer> {
  const absPath = path.isAbsolute(templatePath)
    ? templatePath
    : path.join(process.cwd(), templatePath);
  const content = await fs.readFile(absPath);

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const productsWithPosition = data.products.map((p, i) => ({
    ...p,
    position: String(i + 1),
  }));

  doc.render({
    ...data,
    products: productsWithPosition,
    // Composer-derived fields (default to empty so the template doesn't show {placeholders})
    product_group_intro: data.product_group_intro ?? data.product_group_description ?? "",
    gost_references_block: data.gost_references_block ?? "",
    has_appendix: data.has_appendix ?? "",
    kod_tn_ved_line: data.kod_tn_ved_line ?? "согласно приложению",
    // Defaults so unfilled admin fields don't render as literal "{registration_no}" in the docx
    registration_no: data.registration_no ?? "_____________",
    registered_at: data.registered_at ?? "__.__.____",
    valid_until: data.valid_until ?? "__.__.____",
    protocol_no: data.protocol_no ?? "_____________",
  });

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
