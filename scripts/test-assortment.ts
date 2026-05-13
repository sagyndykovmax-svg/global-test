import { composeDeclaration } from "../src/templates/declaration-eaeu-light/compose";

const cases = [
  {
    name: "Один сарафан → платья, в том числе модель «сарафан»",
    products: [{ product_name: "Сарафан", product_composition: "лён 100%", production_type: "woven" as const, gender_hint: "women" as const }],
    brand: "TestBrand",
  },
  {
    name: "Платье + сарафан → платья, в том числе модель «сарафан» (без дубля)",
    products: [
      { product_name: "Платья", product_composition: "вискоза 100%", production_type: "woven" as const, gender_hint: "women" as const },
      { product_name: "Сарафан", product_composition: "лён 100%", production_type: "woven" as const, gender_hint: "women" as const },
    ],
    brand: "TestBrand",
  },
  {
    name: "Трусы с несколькими моделями → трусы, в том числе моделей: …",
    products: [
      { product_name: "Боксеры", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "men" as const },
      { product_name: "Слипы", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "men" as const },
      { product_name: "Бразилианы", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "women" as const },
    ],
    brand: "TestBrand",
  },
  {
    name: "Брюки + бриджи + джинсы → брюки, в том числе моделей: «бриджи», «джинсы»",
    products: [
      { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven" as const, gender_hint: "men" as const },
      { product_name: "Бриджи", product_composition: "хлопок 100%", production_type: "woven" as const, gender_hint: "men" as const },
      { product_name: "Джинсы", product_composition: "хлопок 100%", production_type: "woven" as const, gender_hint: "men" as const },
    ],
    brand: "TestBrand",
  },
  {
    name: "Худи + толстовка → толстовки, в том числе модель «худи»",
    products: [
      { product_name: "Толстовки", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "auto" as const },
      { product_name: "Худи", product_composition: "хлопок 100%", production_type: "knit" as const, gender_hint: "auto" as const },
    ],
    brand: "TestBrand",
  },
];

for (const c of cases) {
  console.log(`\n--- ${c.name} ---`);
  const out = composeDeclaration({ products: c.products, brand_name: c.brand });
  console.log(out.product_group_description);
}
