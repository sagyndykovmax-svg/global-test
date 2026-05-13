import { composeDeclaration } from "../src/templates/declaration-eaeu-light/compose";

const out = composeDeclaration({
  products: [
    { product_name: "Блузки", product_composition: "состав: хлопок 50%, лён 40%, полиэстер 10%", production_type: "woven" as const, gender_hint: "women" as const },
    { product_name: "Пиджак", product_composition: "состав: полиэстер 50%, хлопок 50%", production_type: "woven" as const, gender_hint: "men" as const },
  ],
  brand_name: "Любая",
});
console.log(out.product_group_description);
