import { deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

const cases: Array<{ row: any; expected?: string; note: string }> = [
  // Original Фарида cases — auto gender (woman from name)
  { row: { product_name: "Платья", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "auto" }, expected: "6204430000", note: "Платья швейные синтетика → 6204.43" },
  { row: { product_name: "Блузки", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "auto" }, expected: "6206400000", note: "Блузки → 6206.40" },
  // User's new test: Брюки knit шерсть+хлопок+спандекс для взрослых
  { row: { product_name: "Брюки", product_composition: "шерсть 70%, хлопок 25%, спандекс 5%", production_type: "knit", gender_hint: "adults" }, expected: "6104610001", note: "Брюки трикотаж шерсть-доминанта взрослые → 6104.61.0001 (override)" },
  // Брюки с per-item men gender
  { row: { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" }, expected: "6203620000", note: "Брюки муж хлопок → 6203.62" },
  // Брюки с per-item women gender
  { row: { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" }, expected: "6204620000", note: "Брюки жен хлопок → 6204.62" },
  // Костюмы с явным gender
  { row: { product_name: "Костюмы", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "men" }, expected: "6203110000", note: "Костюмы муж шерсть → 6203.11" },
  { row: { product_name: "Костюмы", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }, expected: "6204110000", note: "Костюмы жен шерсть → 6204.11" },
  // Kids
  { row: { product_name: "Куртки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "kids" }, expected: "6209300000", note: "Детская одежда → 6209.30" },
  // EAEU subdivisions within 6104.61
  { row: { product_name: "Шорты", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }, expected: "6104610009", note: "Шорты женские трикотаж шерсть → 6104.61.0009" },
  { row: { product_name: "Комбинезоны", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }, expected: "6104610009", note: "Комбинезоны женские трикотаж шерсть → 6104.61.0009" },
  { row: { product_name: "Бриджи", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }, expected: "6104610001", note: "Бриджи женские трикотаж шерсть → 6104.61.0001" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = deriveTnVedCode(c.row);
  const ok = got === c.expected;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "✓" : "✗"}  ${got.padEnd(12)}  ${ok ? "" : `(ждали ${c.expected})`}  ${c.note}`);
}
console.log(`\nИтог: ${pass} passed, ${fail} failed`);
