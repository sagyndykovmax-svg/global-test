/**
 * Sanity check for deriveTnVedCode after EEC PDF-based fix.
 * Run: npx tsx scripts/verify-tnved-codes.ts
 */
import { deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

type Case = {
  desc: string;
  name: string;
  prod: "knit" | "woven";
  gender: "men" | "women" | "kids" | "auto";
  comp: string;
  expect: string; // expected code from EEC ETT
};

const cases: Case[] = [
  // === ВЕРХНЯЯ ОДЕЖДА ТКАНЬ (62 серия) — ключевой ранее сломанный путь ===
  { desc: "пальто муж шерсть тканое",      name: "Пальто",    prod: "woven", gender: "men",   comp: "шерсть 80%, полиэстер 20%", expect: "6201200000" },
  { desc: "пальто муж хлопок тканое",      name: "Пальто",    prod: "woven", gender: "men",   comp: "хлопок 100%",               expect: "6201300000" },
  { desc: "куртка муж синт тканая",        name: "Куртки",    prod: "woven", gender: "men",   comp: "полиэстер 100%",            expect: "6201400000" },
  { desc: "пальто муж 50/50 прочие",       name: "Пальто",    prod: "woven", gender: "men",   comp: "хлопок 50%, полиэстер 50%", expect: "6201900000" },
  { desc: "пальто жен шерсть тканое",      name: "Пальто",    prod: "woven", gender: "women", comp: "шерсть 70%, нейлон 30%",    expect: "6202200000" },
  { desc: "пальто жен синт",               name: "Пальто",    prod: "woven", gender: "women", comp: "полиэстер 100%",            expect: "6202400001" },
  { desc: "куртка жен прочие материалы",   name: "Куртки",    prod: "woven", gender: "women", comp: "хлопок 50%, синт 50%",       expect: "6202900001" },

  // === ВЕРХНЯЯ ОДЕЖДА ТРИКОТАЖ ===
  { desc: "пальто муж knit хлопок",        name: "Пальто",    prod: "knit",  gender: "men",   comp: "хлопок 100%",               expect: "6101201000" },
  { desc: "куртка муж knit синт",          name: "Куртки",    prod: "knit",  gender: "men",   comp: "полиэстер 100%",            expect: "6101301000" },
  { desc: "пальто жен knit шерсть",        name: "Пальто",    prod: "knit",  gender: "women", comp: "шерсть 100%",               expect: "6102101000" },

  // === КОСТЮМЫ ТКАНЬ ===
  { desc: "костюм муж шерсть",             name: "Костюмы",   prod: "woven", gender: "men",   comp: "шерсть 100%",               expect: "6203110000" },
  { desc: "костюм муж хлопок",             name: "Костюмы",   prod: "woven", gender: "men",   comp: "хлопок 100%",               expect: "6203120000" },
  { desc: "костюм жен шерсть",             name: "Костюмы",   prod: "woven", gender: "women", comp: "шерсть 100%",               expect: "6204110000" },
  { desc: "костюм жен синт",               name: "Костюмы",   prod: "woven", gender: "women", comp: "полиэстер 100%",            expect: "6204130000" },

  // === ПИДЖАКИ / ЖАКЕТЫ ===
  { desc: "пиджак муж шерсть",             name: "Пиджак",    prod: "woven", gender: "men",   comp: "шерсть 100%",               expect: "6203310000" },
  { desc: "пиджак муж хлопок",             name: "Пиджак",    prod: "woven", gender: "men",   comp: "хлопок 100%",               expect: "6203329000" },
  { desc: "пиджак муж 50/50 (прочие)",     name: "Пиджак",    prod: "woven", gender: "men",   comp: "хлопок 50%, полиэстер 50%", expect: "6203399000" },
  { desc: "жакет жен шерсть",              name: "Жакеты",    prod: "woven", gender: "women", comp: "шерсть 90%, нейлон 10%",    expect: "6204310000" },
  { desc: "жакет жен синт",                name: "Жакеты",    prod: "woven", gender: "women", comp: "полиэстер 100%",            expect: "6204339000" },

  // === БРЮКИ ===
  { desc: "брюки муж хлопок",              name: "Брюки",     prod: "woven", gender: "men",   comp: "хлопок 100%",               expect: "6203423500" },
  { desc: "брюки муж синт",                name: "Брюки",     prod: "woven", gender: "men",   comp: "полиэстер 100%",            expect: "6203431900" },
  { desc: "брюки жен хлопок",              name: "Брюки",     prod: "woven", gender: "women", comp: "хлопок 100%",               expect: "6204623900" },
  { desc: "шорты жен хлопок",              name: "Шорты",     prod: "woven", gender: "women", comp: "хлопок 100%",               expect: "6204629000" },
  { desc: "комбинез жен хлопок",           name: "Комбинезоны",prod: "woven",gender: "women", comp: "хлопок 100%",               expect: "6204625900" },

  // === БРЮКИ ТРИКОТАЖ ===
  { desc: "брюки жен knit шерсть",         name: "Брюки",     prod: "knit",  gender: "women", comp: "шерсть 100%",               expect: "6104610001" },
  { desc: "шорты жен knit хлопок",         name: "Шорты",     prod: "knit",  gender: "women", comp: "хлопок 100%",               expect: "6104620009" },

  // === ПЛАТЬЯ / ЮБКИ ===
  { desc: "платье жен шерсть",             name: "Платья",    prod: "woven", gender: "women", comp: "шерсть 100%",               expect: "6204410000" },
  { desc: "платье жен хлопок",             name: "Платья",    prod: "woven", gender: "women", comp: "хлопок 100%",               expect: "6204420000" },
  { desc: "платье жен синт",               name: "Платья",    prod: "woven", gender: "women", comp: "полиэстер 100%",            expect: "6204430000" },
  { desc: "юбка жен синт",                 name: "Юбки",      prod: "woven", gender: "women", comp: "полиэстер 60%, хлопок 40%", expect: "6204530000" },

  // === РУБАШКИ / БЛУЗКИ ===
  { desc: "рубашка муж хлопок",            name: "Рубашки",   prod: "woven", gender: "men",   comp: "хлопок 100%",               expect: "6205200000" },
  { desc: "блузка жен синт",               name: "Блузки",    prod: "woven", gender: "women", comp: "полиэстер 100%",            expect: "6206400000" },

  // === ТРИКОТАЖ — футболки/свитеры ===
  { desc: "футболка хлопок",               name: "Футболки",  prod: "knit",  gender: "auto",  comp: "хлопок 100%",               expect: "6109100000" },
  { desc: "свитер шерсть жен",             name: "Свитеры",   prod: "knit",  gender: "auto",  comp: "шерсть 100%",               expect: "6110119000" },
  { desc: "толстовка хлопок",              name: "Толстовки", prod: "knit",  gender: "auto",  comp: "хлопок 100%",               expect: "6110209900" },

  // === ДЕТСКАЯ ===
  { desc: "комбинезон детский knit",       name: "Комбинезоны",prod: "knit",gender: "kids",  comp: "хлопок 100%",               expect: "6111209000" },
  { desc: "платье детское woven",          name: "Платья",    prod: "woven", gender: "kids",  comp: "хлопок 100%",               expect: "6209200000" },
];

let ok = 0;
let fail = 0;
for (const c of cases) {
  const got = deriveTnVedCode({
    product_name: c.name,
    product_composition: c.comp,
    production_type: c.prod,
    gender_hint: c.gender,
    description_override: "",
  } as any);
  const pass = got === c.expect;
  if (pass) ok++;
  else fail++;
  const tag = pass ? "OK " : "FAIL";
  console.log(`${tag}  ${c.desc.padEnd(40)} got=${got}  expect=${c.expect}`);
}
console.log(`\n${ok}/${cases.length} passed (${fail} failed)`);
