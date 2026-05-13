import { deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

const cases: Array<{ name: string; row: any }> = [
  { name: "Сорочки ночные жен трикотаж хлопок", row: { product_name: "Сорочки ночные", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" } },
  { name: "Пеньюар жен швейн шёлк", row: { product_name: "Пеньюар", product_composition: "шёлк 100%", production_type: "woven", gender_hint: "women" } },
  { name: "Бразилианы жен трикотаж хлопок", row: { product_name: "Бразилианы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" } },
  { name: "Худи adults трикотаж хлопок", row: { product_name: "Худи", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" } },
  { name: "Свитшот adults трикотаж хлопок", row: { product_name: "Свитшот", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" } },
  { name: "Лонгсливы детские", row: { product_name: "Лонгсливы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "kids" } },
  { name: "Жилеты женские шерсть", row: { product_name: "Жилеты", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" } },
];

for (const c of cases) {
  console.log(`${c.name}: ${deriveTnVedCode(c.row) || "EMPTY"}`);
}
