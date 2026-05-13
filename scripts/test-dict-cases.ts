/**
 * Test the new fabric phrase composer against all 39 entries from the corrected
 * composition-dictionary.docx that the user supplied.
 *
 * Format: each case is (composition, expected_phrase). production_type defaults to "woven"
 * since the dictionary shows ткань versions. The composer should produce a phrase
 * that includes the corrected fabric name + composition parens.
 */
import { fabricPhrase } from "../src/templates/declaration-eaeu-light/compose";

type Case = { composition: string; expected: string; note: string };

// Note: dictionary shows phrases without composition parens — we strip parens from our
// output before comparing structural correctness.
const STRIP_PARENS = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

const CASES: Case[] = [
  // Section 1: чистые материалы (100%)
  { composition: "хлопок 100%", expected: "из хлопчатобумажной ткани", note: "1. Хлопок 100%" },
  { composition: "лён 100%", expected: "из чистольняной ткани", note: "2. Лён 100%" },
  { composition: "шерсть 100%", expected: "из чистошерстяной ткани", note: "3. Шерсть 100%" },
  { composition: "шёлк 100%", expected: "из ткани из нитей натурального шёлка", note: "4. Шёлк 100%" },
  { composition: "полиэстер 100%", expected: "из ткани из синтетических нитей", note: "5. Полиэстер 100%" },
  { composition: "нейлон 100%", expected: "из ткани из синтетических нитей", note: "6. Нейлон 100%" },
  { composition: "акрил 100%", expected: "из ткани из синтетических нитей", note: "7. Акрил 100%" },
  { composition: "вискоза 100%", expected: "из ткани из искусственных волокон", note: "8. Вискоза 100%" },
  { composition: "модал 100%", expected: "из ткани из искусственных волокон", note: "9. Модал 100%" },

  // Section 2: натуральный с примесью
  { composition: "хлопок 95%, эластан 5%", expected: "из хлопчатобумажной ткани с вложением синтетических нитей", note: "10. Хлопок 95% + эластан 5%" },
  { composition: "хлопок 90%, эластан 10%", expected: "из хлопчатобумажной ткани с вложением синтетических нитей", note: "11. Хлопок 90% + эластан 10%" },
  { composition: "хлопок 95%, полиэстер 5%", expected: "из хлопчатобумажной ткани с вложением синтетических нитей", note: "12. Хлопок 95% + полиэстер 5%" },
  // 13: пользователь оставил "с вложением" для 80/20, но памятка говорит ">10% = в смеси". Применяем памятку:
  { composition: "хлопок 80%, полиэстер 20%", expected: "из хлопчатобумажной ткани в сочетании с синтетическими нитями", note: "13. Хлопок 80% + полиэстер 20% (per памятка)" },
  { composition: "хлопок 80%, вискоза 20%", expected: "из хлопчатобумажной ткани в сочетании с искусственными волокнами", note: "14. Хлопок 80% + вискоза 20%" },
  { composition: "шерсть 80%, эластан 20%", expected: "из шерстяной ткани в сочетании с синтетическими нитями", note: "15. Шерсть 80% + эластан 20%" },
  { composition: "шерсть 70%, полиэстер 30%", expected: "из шерстяной ткани в сочетании с синтетическими нитями", note: "16. Шерсть 70% + полиэстер 30%" },
  { composition: "шерсть 60%, вискоза 40%", expected: "из полушерстяной ткани", note: "17. Шерсть 60% + вискоза 40%" },
  { composition: "лён 80%, эластан 20%", expected: "из полульняной ткани", note: "18. Лён 80% + эластан 20%" },
  { composition: "лён 60%, вискоза 40%", expected: "из полульняной ткани", note: "19. Лён 60% + вискоза 40%" },
  { composition: "шёлк 90%, эластан 10%", expected: "из ткани из нитей натурального шёлка с вложением синтетических нитей", note: "20. Шёлк 90% + эластан 10%" },

  // Section 3: смесь натуральных
  { composition: "шерсть 60%, хлопок 40%", expected: "из полушерстяной ткани", note: "21. Шерсть 60% + хлопок 40%" },
  { composition: "шерсть 80%, шёлк 20%", expected: "из шерстяной ткани в сочетании с нитями натурального шёлка", note: "22. Шерсть 80% + шёлк 20% (silk admixture uses spec phrase)" },
  { composition: "хлопок 60%, лён 40%", expected: "из полульняной ткани", note: "23. Хлопок 60% + лён 40% (лён имеет приоритет)" },
  { composition: "хлопок 70%, шёлк 30%", expected: "из хлопчатобумажной ткани в сочетании с нитями натурального шёлка", note: "24. Хлопок 70% + шёлк 30%" },
  { composition: "лён 50%, шёлк 50%", expected: "из полульняной ткани", note: "25. Лён 50% + шёлк 50%" },

  // Section 4: смесь натуральных с примесью
  { composition: "шерсть 70%, хлопок 25%, спандекс 5%", expected: "из шерстяной ткани", note: "26. Шерсть 70% + хлопок 25% + спандекс 5% (≥70% wool + 2+ others → no admixture)" },
  { composition: "шерсть 60%, хлопок 30%, эластан 10%", expected: "из полушерстяной ткани", note: "27. Шерсть 60% + хлопок 30% + эластан 10%" },
  { composition: "хлопок 60%, лён 30%, эластан 10%", expected: "из полульняной ткани", note: "28. Хлопок 60% + лён 30% + эластан 10% (лён приоритет)" },
  { composition: "шерсть 60%, хлопок 30%, вискоза 10%", expected: "из полушерстяной ткани", note: "29. Шерсть 60% + хлопок 30% + вискоза 10%" },
  { composition: "шерсть 50%, хлопок 35%, полиэстер 10%, эластан 5%", expected: "из полушерстяной ткани", note: "30. Шерсть 50% + хлопок 35% + полиэстер 10% + эластан 5%" },

  // Section 5: синтетико-доминантные
  { composition: "полиэстер 80%, вискоза 20%", expected: "из ткани из сочетания синтетических нитей и искусственных волокон", note: "31. Полиэстер 80% + вискоза 20%" },
  { composition: "полиэстер 80%, вискоза 15%, эластан 5%", expected: "из ткани из сочетания синтетических нитей и искусственных волокон", note: "32. Полиэстер 80% + вискоза 15% + эластан 5%" },
  { composition: "полиэстер 50%, вискоза 50%", expected: "из ткани из сочетания синтетических нитей и искусственных волокон", note: "33. Полиэстер 50% + вискоза 50%" },
  { composition: "полиэстер 60%, хлопок 40%", expected: "из ткани из сочетания синтетических нитей и хлопковых волокон", note: "34. Полиэстер 60% + хлопок 40%" },
  { composition: "полиэстер 70%, шерсть 30%", expected: "из полушерстяной ткани", note: "35. Полиэстер 70% + шерсть 30% (шерсть-приоритет)" },
  { composition: "полиэстер 95%, эластан 5%", expected: "из ткани из синтетических нитей", note: "36. Полиэстер 95% + эластан 5% (одна категория)" },
  { composition: "полиэстер 50%, нейлон 50%", expected: "из ткани из синтетических нитей", note: "37. Полиэстер 50% + нейлон 50% (одна категория)" },
  { composition: "вискоза 70%, полиэстер 30%", expected: "из ткани из сочетания искусственных волокон и синтетических нитей", note: "38. Вискоза 70% + полиэстер 30% (порядок по убыванию)" },
  { composition: "вискоза 60%, ацетат 40%", expected: "из ткани из искусственных волокон", note: "39. Вискоза 60% + ацетат 40% (одна категория)" },
];

let pass = 0;
let fail = 0;
const failures: Array<{ note: string; got: string; expected: string }> = [];

for (const c of CASES) {
  const out = STRIP_PARENS(fabricPhrase(c.composition, "woven"));
  const ok = out === c.expected;
  if (ok) {
    pass++;
    console.log(`✓ ${c.note}`);
  } else {
    fail++;
    failures.push({ note: c.note, got: out, expected: c.expected });
    console.log(`✗ ${c.note}`);
    console.log(`   got:      ${out}`);
    console.log(`   expected: ${c.expected}`);
  }
}

console.log(`\nИтог: ${pass}/${CASES.length} passed`);
if (fail > 0) process.exit(1);
