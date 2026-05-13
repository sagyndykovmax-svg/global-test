/**
 * End-to-end test for the exact scenario from user's screenshot:
 *   - Блузки (хлопок 50%, лён 40%, полиэстер 10%) для женщин
 *   - Пиджак (полиэстер 50%, хлопок 50%) для мужчин
 *   - Бренд «Любая»
 *
 * Expected:
 *   - Описание: «Изделия верхние второго слоя швейные из полульняной ткани,
 *     из ткани из сочетания синтетических нитей и хлопковых волокон
 *     для взрослых: блузки, пиджаки, с маркировкой «Любая»»
 *   - ТН ВЭД пиджака = 6203399000
 *   - ГОСТы = 25294 + 25295
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { composeDeclaration, deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

const products = [
  { product_name: "Блузки", product_composition: "хлопок 50%, лён 40%, полиэстер 10%", production_type: "woven" as const, gender_hint: "women" as const },
  { product_name: "Пиджак", product_composition: "полиэстер 50%, хлопок 50%", production_type: "woven" as const, gender_hint: "men" as const },
];

for (const p of products) {
  console.log(`${p.product_name}: ${deriveTnVedCode(p)}`);
}

const composed = composeDeclaration({ products, brand_name: "Любая" });
console.log("\n📝 Описание:", composed.product_group_description);
console.log("📚 ГОСТы:", composed.gost_references_block);
console.log("📎 has_appendix:", composed.has_appendix);

// Full DOCX render
const productsForDocx = products.map((p, i) => ({
  ...p,
  position: String(i + 1),
  tn_ved_code: deriveTnVedCode(p),
}));

const data = {
  applicant_full_name: "ИП Тестов",
  applicant_okpo: "12345678",
  applicant_inn: "12345678901234",
  applicant_country: "Кыргызская Республика",
  applicant_address: "Бишкек, ул. Тестовая, 1",
  applicant_phone: "996700000000",
  applicant_email: "test@example.com",
  applicant_signatory: "Тестов Т.Т.",
  manufacturer_full_name: "ИП Тестов",
  manufacturer_country: "Кыргызская Республика",
  manufacturer_address: "Бишкек, ул. Тестовая, 1",
  registration_no: "____",
  registered_at: "__.__.____",
  valid_until: "__.__.____",
  protocol_no: "____",
  products: productsForDocx,
  product_group_description: composed.product_group_description,
  product_group_intro: composed.product_group_intro,
  gost_references_block: composed.gost_references_block,
  has_appendix: composed.has_appendix,
  kod_tn_ved_line: composed.kod_tn_ved_line,
};

async function main() {
  const templatePath = path.join(process.cwd(), "templates/declaration-eaeu-light/template.docx");
  const content = await readFile(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  const out = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  await writeFile("test-final.docx", out);
  console.log(`\n✓ test-final.docx (${out.length} bytes)`);
}
main();
