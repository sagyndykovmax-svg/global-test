import { deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

const cases: Array<{ row: any; expected?: string; note: string }> = [
  // Original Фарида cases — auto gender (woman from name)
  { row: { product_name: "Платья", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "auto" }, expected: "6204430000", note: "Платья швейные синтетика → 6204.43" },
  { row: { product_name: "Блузки", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "auto" }, expected: "6206400000", note: "Блузки → 6206.40" },
  // User's new test: Брюки knit шерсть+хлопок+спандекс для взрослых
  { row: { product_name: "Брюки", product_composition: "шерсть 70%, хлопок 25%, спандекс 5%", production_type: "knit", gender_hint: "adults" }, expected: "6104610001", note: "Брюки трикотаж шерсть-доминанта взрослые → 6104.61.0001 (override)" },
  // Брюки с per-item men gender
  { row: { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" }, expected: "6203423500", note: "Брюки муж хлопок → 6203.42.3500" },
  // Брюки с per-item women gender
  { row: { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" }, expected: "6204623900", note: "Брюки жен хлопок → 6204.62.3900" },
  // Костюмы с явным gender
  { row: { product_name: "Костюмы", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "men" }, expected: "6203110000", note: "Костюмы муж шерсть → 6203.11" },
  { row: { product_name: "Костюмы", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }, expected: "6204110000", note: "Костюмы жен шерсть → 6204.11" },
  // Kids
  { row: { product_name: "Куртки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "kids" }, expected: "6209300000", note: "Детская одежда → 6209.30" },
  // EAEU subdivisions within 6104.61
  { row: { product_name: "Шорты", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }, expected: "6104610009", note: "Шорты женские трикотаж шерсть → 6104.61.0009" },
  { row: { product_name: "Комбинезоны", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }, expected: "6104610009", note: "Комбинезоны женские трикотаж шерсть → 6104.61.0009" },
  { row: { product_name: "Бриджи", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }, expected: "6104610001", note: "Бриджи женские трикотаж шерсть → 6104.61.0001" },
  // Бельё: код зависит от вида изделия
  { row: { product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }, expected: "6108210000", note: "Трусы жен трикотаж хлопок → 6108.21" },
  { row: { product_name: "Трусы", product_composition: "полиэстер 100%", production_type: "knit", gender_hint: "men" }, expected: "6107120000", note: "Трусы муж трикотаж синт → 6107.12" },
  { row: { product_name: "Трусы", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" }, expected: "6208910000", note: "Трусы жен швейные хлопок → 6208.91" },
  { row: { product_name: "Пижамы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }, expected: "6108310000", note: "Пижамы жен трикотаж хлопок → 6108.31" },
  { row: { product_name: "Сорочки ночные", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" }, expected: "6208220000", note: "Сорочки ночные жен швейные синт → 6208.22" },
  { row: { product_name: "Комбинации", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" }, expected: "6208190001", note: "Комбинации жен швейные хлопок → 6208.19.0001" },
  { row: { product_name: "Бюстгальтеры", product_composition: "полиэстер 100%", production_type: "knit", gender_hint: "women" }, expected: "6212109000", note: "Бюстгальтеры → 6212.10.9000" },
  { row: { product_name: "Майки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }, expected: "6109100000", note: "Майки трикотаж хлопок → 6109.10" },
  // Позиции, у которых материал уходит в последние цифры
  { row: { product_name: "Блузки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }, expected: "6106100000", note: "Блузки трикотаж хлопок → 6106.10" },
  { row: { product_name: "Блузки", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }, expected: "6206200000", note: "Блузки швейные шерсть → 6206.20" },
  { row: { product_name: "Костюмы", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "men" }, expected: "6203120000", note: "Костюмы муж синт → 6203.12" },
  { row: { product_name: "Костюмы", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" }, expected: "6203191000", note: "Костюмы муж хлопок → 6203.19.1000" },
  { row: { product_name: "Рубашки", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "men" }, expected: "6205908001", note: "Рубашки муж шерсть → 6205.90.8001" },
  { row: { product_name: "Брюки", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "men" }, expected: "6103410000", note: "Брюки муж трикотаж шерсть → 6103.41" },
  { row: { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }, expected: "6104620000", note: "Брюки жен трикотаж хлопок → 6104.62" },
  { row: { product_name: "Платья", product_composition: "полиэстер 50%, хлопок 50%", production_type: "woven", gender_hint: "women" }, expected: "6204499000", note: "Платья 50/50 → 6204.49.9000" },
  // Куртки отдельно от пальто
  { row: { product_name: "Куртки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" }, expected: "6202400009", note: "Куртки жен швейные синт → 6202.40.0009" },
  { row: { product_name: "Пальто", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" }, expected: "6202400001", note: "Пальто жен швейные синт → 6202.40.0001" },
  { row: { product_name: "Куртки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" }, expected: "6101209000", note: "Куртки муж трикотаж хлопок → 6101.20.9000" },
  { row: { product_name: "Пуховики", product_composition: "полиэстер 100%", production_type: "knit", gender_hint: "women" }, expected: "6102309000", note: "Пуховики жен трикотаж синт → 6102.30.9000" },
  // Спортивные, лыжные, купальные
  { row: { product_name: "Костюмы спортивные", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" }, expected: "6112110000", note: "Спорткостюмы трикотаж хлопок → 6112.11" },
  { row: { product_name: "Костюмы спортивные", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "men" }, expected: "6211339000", note: "Спорткостюмы муж швейные синт → 6211.33.9000" },
  { row: { product_name: "Костюмы спортивные", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" }, expected: "6211429000", note: "Спорткостюмы жен швейные хлопок → 6211.42.9000" },
  { row: { product_name: "Костюмы лыжные", product_composition: "полиэстер 100%", production_type: "knit", gender_hint: "women" }, expected: "6112200000", note: "Лыжные костюмы трикотаж → 6112.20" },
  { row: { product_name: "Купальники", product_composition: "полиамид 85%, эластан 15%", production_type: "knit", gender_hint: "women" }, expected: "6112411000", note: "Купальники синт с эластаном → 6112.41.1000" },
  { row: { product_name: "Купальники", product_composition: "полиэстер 100%", production_type: "knit", gender_hint: "women" }, expected: "6112419000", note: "Купальники синт без эластана → 6112.41.9000" },
  // Искусственные волокна отдельно от синтетики
  { row: { product_name: "Юбки", product_composition: "вискоза 100%", production_type: "woven", gender_hint: "women" }, expected: "6204591000", note: "Юбки вискоза → 6204.59.1000" },
  { row: { product_name: "Брюки", product_composition: "вискоза 100%", production_type: "woven", gender_hint: "women" }, expected: "6204691800", note: "Брюки жен вискоза → 6204.69.1800" },
  { row: { product_name: "Брюки", product_composition: "вискоза 100%", production_type: "woven", gender_hint: "men" }, expected: "6203491900", note: "Брюки муж вискоза → 6203.49.1900" },
  { row: { product_name: "Шорты", product_composition: "вискоза 100%", production_type: "knit", gender_hint: "women" }, expected: "6104690002", note: "Шорты жен трикотаж вискоза → 6104.69.0002" },
  { row: { product_name: "Пиджаки", product_composition: "вискоза 100%", production_type: "woven", gender_hint: "men" }, expected: "6203391900", note: "Пиджаки муж вискоза → 6203.39.1900" },
  { row: { product_name: "Брюки", product_composition: "лён 100%", production_type: "woven", gender_hint: "women" }, expected: "6204699000", note: "Брюки жен лён → 6204.69.9000" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = deriveTnVedCode(c.row);
  const ok = got === c.expected;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "✓" : "✗"}  ${got.padEnd(12)}  ${ok ? "" : `(ждали ${c.expected})`}  ${c.note}`);
}
console.log(`\nИтог: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
