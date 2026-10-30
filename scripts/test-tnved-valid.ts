/**
 * Каждый код, который выдаёт deriveTnVedCode, должен существовать в ТН ВЭД ЕАЭС.
 * Перебирает изделия × производство × пол × состав и сверяет со списком
 * scripts/fixtures/ett-codes-ch61-62.txt (коды из официальных PDF ЕЭК).
 * Run: npx tsx scripts/test-tnved-valid.ts
 */
import { readFileSync } from "node:fs";
import { deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

const known = new Set(
  readFileSync("scripts/fixtures/ett-codes-ch61-62.txt", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^\d{10}$/.test(line)),
);

const NAMES = [
  "Трусы", "Боксеры", "Майки", "Топ", "Пижамы", "Сорочки ночные", "Кальсоны", "Панталоны",
  "Боди", "Комбинации", "Пеньюар", "Бюстгальтеры", "Фуфайки", "Футболки", "Лонгсливы",
  "Платья", "Сарафан", "Блузки", "Юбки", "Рубашки", "Брюки", "Бриджи", "Джинсы", "Шорты",
  "Комбинезоны", "Костюмы", "Пиджаки", "Жакеты", "Жилеты", "Свитеры", "Джемперы", "Кардиганы",
  "Толстовки", "Худи", "Пальто", "Куртки", "Плащи", "Пуховики", "Парки",
  "Костюмы спортивные", "Костюмы лыжные", "Купальники", "Купальные костюмы",
];
const PRODUCTIONS = ["knit", "woven"];
const GENDERS = ["women", "men", "kids", "adults"];
const COMPOSITIONS = [
  "хлопок 100%", "хлопок 95%, эластан 5%", "шерсть 100%", "шерсть 70%, полиэстер 30%",
  "лён 100%", "шёлк 100%", "полиэстер 100%", "полиэстер 80%, вискоза 15%, эластан 5%",
  "вискоза 100%", "полиэстер 50%, хлопок 50%", "хлопок 35%, вискоза 25%, полиэстер 25%, шерсть 15%",
];

const invalid = new Map<string, string>();
let checked = 0;
for (const product_name of NAMES) {
  for (const production_type of PRODUCTIONS) {
    for (const gender_hint of GENDERS) {
      for (const product_composition of COMPOSITIONS) {
        const code = deriveTnVedCode({ product_name, production_type, gender_hint, product_composition } as never);
        checked++;
        if (code && !known.has(code) && !invalid.has(code)) {
          invalid.set(code, `${product_name} | ${production_type} | ${gender_hint} | ${product_composition}`);
        }
      }
    }
  }
}

for (const [code, example] of [...invalid].sort()) console.log(`✗  ${code}  ${example}`);
console.log(`\nИтог: ${checked} комбинаций, справочник ${known.size} кодов, несуществующих кодов: ${invalid.size}`);
if (invalid.size > 0) process.exit(1);
