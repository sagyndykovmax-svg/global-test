/**
 * End-to-end render test: composeDeclaration → docxtemplater → DOCX files.
 * Runs the actual code path that the API endpoint uses.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

// Import composer via tsx-compatible path (use .ts ESM loader)
import { composeDeclaration } from "../src/templates/declaration-eaeu-light/compose.ts";

const templatePath = path.join(process.cwd(), "templates/declaration-eaeu-light/template.docx");

const baseAdmin = {
  applicant_full_name: "Индивидуальный предприниматель Тестов Тест Тестович",
  applicant_okpo: "33251958",
  applicant_inn: "12903197400363",
  applicant_country: "Кыргызская Республика",
  applicant_address: "г. Бишкек, пр. Манаса 1",
  applicant_phone: "996500111222",
  applicant_email: "test@example.com",
  applicant_signatory: "Тестов Тест Тестович",
  manufacturer_full_name: "ИП Тестов",
  manufacturer_country: "Кыргызская Республика",
  manufacturer_address: "г. Бишкек, пр. Манаса 1",
  registration_no: "RU-Д-KG.PA01.B.12345",
  registered_at: "15.05.2026",
  valid_until: "15.05.2029",
  protocol_no: "ПИ-2026-0142",
};

const SINGLE_PRODUCTS = [
  { product_name: "Блузки", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "women", tn_ved_code: "6206400000" },
];

const MULTI_PRODUCTS = [
  { product_name: "Платья", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "auto", tn_ved_code: "6204430000" },
  { product_name: "Блузки", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "auto", tn_ved_code: "6206400000" },
  { product_name: "Костюмы", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "auto", tn_ved_code: "6204130000" },
];

async function render(products, brand, filename) {
  const composed = composeDeclaration({ products, brand_name: brand });
  // Attach position numbers to products for the appendix table loop
  const productsForDocx = products.map((p, i) => ({ ...p, position: String(i + 1) }));

  const data = {
    ...baseAdmin,
    products: productsForDocx,
    product_group_description: composed.product_group_description,
    product_group_intro: composed.product_group_intro,
    gost_references_block: composed.gost_references_block,
    has_appendix: composed.has_appendix,
    kod_tn_ved_line: composed.kod_tn_ved_line,
  };

  const content = await readFile(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  const out = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  await writeFile(filename, out);
  console.log(`✓ ${filename} (${out.length} bytes)`);
  console.log(`  Описание: ${composed.product_group_description.slice(0, 200)}…`);
}

async function main() {
  await render(SINGLE_PRODUCTS, "Ламода", "test-output-single.docx");
  console.log();
  await render(MULTI_PRODUCTS, "Фарида мода", "test-output-multi.docx");
}
main();
