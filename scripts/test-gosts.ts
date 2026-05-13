import { composeDeclaration } from "../src/templates/declaration-eaeu-light/compose";

const cases = [
  {
    name: "Блузки + Пиджак — оба ГОСТа",
    products: [
      { product_name: "Блузки", product_composition: "хлопок 50%, лён 40%, полиэстер 10%", production_type: "woven" as const, gender_hint: "women" as const },
      { product_name: "Пиджак", product_composition: "полиэстер 50%, хлопок 50%", production_type: "woven" as const, gender_hint: "men" as const },
    ],
  },
  {
    name: "Только блузки → только 25294",
    products: [
      { product_name: "Блузки", product_composition: "хлопок 100%", production_type: "woven" as const, gender_hint: "women" as const },
    ],
  },
  {
    name: "Только пиджаки → только 25295",
    products: [
      { product_name: "Пиджак", product_composition: "шерсть 100%", production_type: "woven" as const, gender_hint: "men" as const },
    ],
  },
  {
    name: "Костюмы + платья → оба ГОСТа",
    products: [
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven" as const, gender_hint: "women" as const },
      { product_name: "Костюм", product_composition: "шерсть 100%", production_type: "woven" as const, gender_hint: "men" as const },
    ],
  },
];

for (const c of cases) {
  console.log(`\n--- ${c.name} ---`);
  const out = composeDeclaration({ products: c.products, brand_name: "X" });
  console.log("ГОСТы:", out.gost_references_block);
}
