/**
 * Full composeDeclaration tests against памятка examples and earlier user cases.
 */
import { composeDeclaration } from "../src/templates/declaration-eaeu-light/compose";

const cases = [
  {
    name: "Памятка P15 — детское бельё, 3 разных состава",
    args: {
      products: [
        { product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "kids" as const },
        { product_name: "Майки", product_composition: "акрил 80%, полиэстер 15%, эластан 5%", production_type: "knit" as const, gender_hint: "kids" as const },
        { product_name: "Пижамы", product_composition: "модал 60%, полиэстер 30%, хлопок 10%", production_type: "knit" as const, gender_hint: "kids" as const },
      ],
      brand_name: "TestBrand",
    },
  },
  {
    name: "Брюки трикотажные шерсть+хлопок+спандекс (1 товар, для взрослых)",
    args: {
      products: [
        { product_name: "Брюки", product_composition: "шерсть 70%, хлопок 25%, спандекс 5%", production_type: "knit" as const, gender_hint: "adults" as const },
      ],
      brand_name: "TestBrand",
    },
  },
  {
    name: "Фарида мода — 3 товара, синтетика-доминанта (швейные, женские)",
    args: {
      products: [
        { product_name: "Платья", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven" as const, gender_hint: "auto" as const },
        { product_name: "Блузки", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven" as const, gender_hint: "auto" as const },
        { product_name: "Костюмы", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven" as const, gender_hint: "auto" as const },
      ],
      brand_name: "Фарида мода",
    },
  },
  {
    name: "Один товар — блузки женские шёлк",
    args: {
      products: [
        { product_name: "Блузки", product_composition: "шёлк 100%", production_type: "woven" as const, gender_hint: "women" as const },
      ],
      brand_name: "SilkBrand",
    },
  },
  {
    name: "Один товар — пальто мужские шерсть",
    args: {
      products: [
        { product_name: "Пальто", product_composition: "шерсть 70%, полиэстер 30%", production_type: "woven" as const, gender_hint: "men" as const },
      ],
      brand_name: "WoolWear",
    },
  },
  {
    name: "Лонгсливы детские (с моделью)",
    args: {
      products: [
        { product_name: "Лонгсливы", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "kids" as const },
      ],
      brand_name: "KidsBrand",
    },
  },
];

for (const c of cases) {
  console.log(`\n--- ${c.name} ---`);
  const out = composeDeclaration(c.args);
  console.log(`📝 Описание:`);
  console.log(out.product_group_description);
  console.log(`📚 ГОСТы: ${out.gost_references_block || "(нет)"}`);
}
