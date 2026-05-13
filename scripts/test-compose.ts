import { composeDeclaration } from "../src/templates/declaration-eaeu-light/compose";

const cases = [
  {
    name: "Фарида мода (3 товара, синтетика-доминанта, женские, ШВЕЙНЫЕ)",
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
    name: "Брюки трикотажные шерсть+хлопок+спандекс — для взрослых (1 товар)",
    args: {
      products: [
        { product_name: "Брюки", product_composition: "(состав: шерсть 70%, хлопок 25%, спандекс 5%)", production_type: "knit" as const, gender_hint: "adults" as const },
      ],
      brand_name: "TestBrand",
    },
  },
  {
    name: "Футболки трикотажные, чистый хлопок",
    args: {
      products: [
        { product_name: "Футболки", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "auto" as const },
      ],
      brand_name: "MyBrand",
    },
  },
  {
    name: "Смешанная гендерная принадлежность (платья + рубашки муж) → для взрослых",
    args: {
      products: [
        { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven" as const, gender_hint: "women" as const },
        { product_name: "Рубашки", product_composition: "хлопок 100%", production_type: "woven" as const, gender_hint: "men" as const },
      ],
      brand_name: "UnisexBrand",
    },
  },
  {
    name: "Свитеры трикотажные, шерсть 100%",
    args: {
      products: [
        { product_name: "Свитеры", product_composition: "шерсть 100%", production_type: "knit" as const, gender_hint: "auto" as const },
      ],
      brand_name: "WoolWear",
    },
  },
  {
    name: "Брюки хлопок 95% + эластан 5% — натуральный с малой синтетической примесью",
    args: {
      products: [
        { product_name: "Брюки", product_composition: "хлопок 95%, эластан 5%", production_type: "woven" as const, gender_hint: "women" as const },
      ],
      brand_name: "CottonBrand",
    },
  },
];

for (const c of cases) {
  console.log(`--- ${c.name} ---`);
  const out = composeDeclaration(c.args);
  console.log(out.product_group_description);
  console.log();
}
