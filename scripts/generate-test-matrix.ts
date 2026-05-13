/**
 * Generate a comprehensive test matrix for declaration composer.
 *
 * Runs composeDeclaration + deriveTnVedCode through ~60 representative cases
 * covering all layers (бельё/2-й/3-й), genders (жен/муж/детск/adults),
 * production types (швейные/трикотаж), and material compositions.
 *
 * Output: docs/test-matrix.docx — table with input + ТН ВЭД + ГОСТ + полное описание.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, HeadingLevel, AlignmentType, BorderStyle,
} from "docx";
import { composeDeclaration, deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

type ProductInput = {
  product_name: string;
  product_composition: string;
  production_type: "woven" | "knit";
  gender_hint: "auto" | "women" | "men" | "kids" | "adults";
};

type Case = {
  section: string;
  label: string;
  products: ProductInput[];
  brand?: string;
};

// ============================================================
// Test cases
// ============================================================

const CASES: Case[] = [
  // ============================================================
  // 1. БЕЛЬЁ 1-го слоя — женские
  // ============================================================
  { section: "1. Бельё 1-го слоя (женские)", label: "Трусы хлопок 100%",
    products: [{ product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Трусы хлопок 95% + эластан 5%",
    products: [{ product_name: "Трусы", product_composition: "хлопок 95%, эластан 5%", production_type: "knit", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Бразилианы хлопок 100% (модель трусов)",
    products: [{ product_name: "Бразилианы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Стринги полиамид 80% эластан 20%",
    products: [{ product_name: "Стринги", product_composition: "полиамид 80%, эластан 20%", production_type: "knit", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Майки хлопок 100%",
    products: [{ product_name: "Майки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Боди хлопок 95% эластан 5%",
    products: [{ product_name: "Боди", product_composition: "хлопок 95%, эластан 5%", production_type: "knit", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Комбинации шёлк 100%",
    products: [{ product_name: "Комбинации", product_composition: "шёлк 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Сорочки ночные хлопок 100%",
    products: [{ product_name: "Сорочки ночные", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские)", label: "Пеньюары шёлк 100% (модель халата ночного)",
    products: [{ product_name: "Пеньюар", product_composition: "шёлк 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "1. Бельё 1-го слоя (женские, корсетные)", label: "Бюстгальтеры синтетика 90% эластан 10%",
    products: [{ product_name: "Бюстгальтеры", product_composition: "полиамид 90%, эластан 10%", production_type: "knit", gender_hint: "women" }] },

  // ============================================================
  // 2. БЕЛЬЁ 1-го слоя — мужские
  // ============================================================
  { section: "2. Бельё 1-го слоя (мужские)", label: "Трусы хлопок 100%",
    products: [{ product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" }] },
  { section: "2. Бельё 1-го слоя (мужские)", label: "Боксеры хлопок 95% эластан 5% (модель)",
    products: [{ product_name: "Боксеры", product_composition: "хлопок 95%, эластан 5%", production_type: "knit", gender_hint: "men" }] },
  { section: "2. Бельё 1-го слоя (мужские)", label: "Кальсоны шерсть 100%",
    products: [{ product_name: "Кальсоны", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "men" }] },
  { section: "2. Бельё 1-го слоя (мужские)", label: "Фуфайки хлопок 100%",
    products: [{ product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" }] },

  // ============================================================
  // 3. БЕЛЬЁ 1-го слоя — детские
  // ============================================================
  { section: "3. Бельё 1-го слоя (детские)", label: "Фуфайки хлопок 100%",
    products: [{ product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "kids" }] },
  { section: "3. Бельё 1-го слоя (детские)", label: "Лонгсливы хлопок 100% (модель фуфайки)",
    products: [{ product_name: "Лонгсливы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "kids" }] },
  { section: "3. Бельё 1-го слоя (детские)", label: "Пижамы хлопок 80% полиэстер 20%",
    products: [{ product_name: "Пижамы", product_composition: "хлопок 80%, полиэстер 20%", production_type: "knit", gender_hint: "kids" }] },
  { section: "3. Бельё 1-го слоя (детские)", label: "Майки хлопок 100%",
    products: [{ product_name: "Майки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "kids" }] },

  // ============================================================
  // 4. 2-й слой ПЛАТЬЕВО-БЛУЗОЧНЫЙ — женские
  // ============================================================
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Платья полиэстер 100%",
    products: [{ product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Платья хлопок 100%",
    products: [{ product_name: "Платья", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Платья шерсть 100%",
    products: [{ product_name: "Платья", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Платья полиэстер 80% вискоза 20%",
    products: [{ product_name: "Платья", product_composition: "полиэстер 80%, вискоза 20%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Сарафан лён 100% (модель платья)",
    products: [{ product_name: "Сарафан", product_composition: "лён 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Блузки шёлк 100%",
    products: [{ product_name: "Блузки", product_composition: "шёлк 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Блузки полиэстер 80% вискоза 15% эластан 5% (Фарида)",
    products: [{ product_name: "Блузки", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Юбки хлопок 100%",
    products: [{ product_name: "Юбки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "4. 2-й слой платьево-блузочный (женские, швейные)", label: "Юбки шерсть 80% эластан 20%",
    products: [{ product_name: "Юбки", product_composition: "шерсть 80%, эластан 20%", production_type: "woven", gender_hint: "women" }] },

  // ============================================================
  // 5. 2-й слой ПЛАТЬЕВО-БЛУЗОЧНЫЙ — трикотаж
  // ============================================================
  { section: "5. 2-й слой платьево-блузочный (трикотаж)", label: "Платья трикотажные вискоза 100%",
    products: [{ product_name: "Платья", product_composition: "вискоза 100%", production_type: "knit", gender_hint: "women" }] },
  { section: "5. 2-й слой платьево-блузочный (трикотаж)", label: "Блузки трикотажные хлопок 100%",
    products: [{ product_name: "Блузки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" }] },
  { section: "5. 2-й слой платьево-блузочный (трикотаж)", label: "Юбки трикотажные шерсть 100%",
    products: [{ product_name: "Юбки", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }] },

  // ============================================================
  // 6. 2-й слой КОСТЮМНЫЙ (ГОСТ 25295)
  // ============================================================
  { section: "6. 2-й слой костюмный (ГОСТ 25295)", label: "Костюмы мужские шерсть 100%",
    products: [{ product_name: "Костюмы", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "men" }] },
  { section: "6. 2-й слой костюмный (ГОСТ 25295)", label: "Костюмы мужские полиэстер 50% хлопок 50% (тай — прочие)",
    products: [{ product_name: "Костюмы", product_composition: "полиэстер 50%, хлопок 50%", production_type: "woven", gender_hint: "men" }] },
  { section: "6. 2-й слой костюмный (ГОСТ 25295)", label: "Пиджаки мужские шерсть 100%",
    products: [{ product_name: "Пиджак", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "men" }] },
  { section: "6. 2-й слой костюмный (ГОСТ 25295)", label: "Пиджаки мужские полиэстер 50% хлопок 50% (твой кейс)",
    products: [{ product_name: "Пиджак", product_composition: "полиэстер 50%, хлопок 50%", production_type: "woven", gender_hint: "men" }] },
  { section: "6. 2-й слой костюмный (ГОСТ 25295)", label: "Жакеты женские шерсть 100%",
    products: [{ product_name: "Жакеты", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "6. 2-й слой костюмный (ГОСТ 25295)", label: "Жилеты шерсть 60% хлопок 40%",
    products: [{ product_name: "Жилеты", product_composition: "шерсть 60%, хлопок 40%", production_type: "woven", gender_hint: "women" }] },

  // ============================================================
  // 7. БРЮКИ И ВАРИАНТЫ
  // ============================================================
  { section: "7. Брюки и варианты", label: "Брюки женские полиэстер 100%",
    products: [{ product_name: "Брюки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "7. Брюки и варианты", label: "Брюки мужские хлопок 100%",
    products: [{ product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" }] },
  { section: "7. Брюки и варианты", label: "Брюки трикотажные шерсть 70% хлопок 25% спандекс 5% (твой случай)",
    products: [{ product_name: "Брюки", product_composition: "шерсть 70%, хлопок 25%, спандекс 5%", production_type: "knit", gender_hint: "adults" }] },
  { section: "7. Брюки и варианты", label: "Бриджи женские трикотаж шерсть 100% (модель)",
    products: [{ product_name: "Бриджи", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }] },
  { section: "7. Брюки и варианты", label: "Джинсы мужские хлопок 100% (модель)",
    products: [{ product_name: "Джинсы", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" }] },
  { section: "7. Брюки и варианты", label: "Шорты женские шерсть 100%",
    products: [{ product_name: "Шорты", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "7. Брюки и варианты", label: "Комбинезоны женские трикотаж шерсть 100%",
    products: [{ product_name: "Комбинезоны", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "women" }] },

  // ============================================================
  // 8. РУБАШКИ / СОРОЧКИ
  // ============================================================
  { section: "8. Сорочки верхние (рубашки)", label: "Рубашки мужские хлопок 100%",
    products: [{ product_name: "Рубашки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" }] },
  { section: "8. Сорочки верхние (рубашки)", label: "Рубашки мужские полиэстер 100%",
    products: [{ product_name: "Рубашки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "men" }] },

  // ============================================================
  // 9. 3-й слой (пальтовый)
  // ============================================================
  { section: "9. 3-й слой пальтовый (ГОСТ 25295)", label: "Пальто женские шерсть 100%",
    products: [{ product_name: "Пальто", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "9. 3-й слой пальтовый (ГОСТ 25295)", label: "Пальто мужские шерсть 70% полиэстер 30%",
    products: [{ product_name: "Пальто", product_composition: "шерсть 70%, полиэстер 30%", production_type: "woven", gender_hint: "men" }] },
  { section: "9. 3-й слой пальтовый (ГОСТ 25295)", label: "Куртки мужские полиэстер 100%",
    products: [{ product_name: "Куртки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "men" }] },
  { section: "9. 3-й слой пальтовый (ГОСТ 25295)", label: "Плащи женские полиэстер 100%",
    products: [{ product_name: "Плащи", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "9. 3-й слой пальтовый (ГОСТ 25295)", label: "Шубы женские шерсть 100%",
    products: [{ product_name: "Шубы", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" }] },
  { section: "9. 3-й слой пальтовый (ГОСТ 25295)", label: "Парки детские полиэстер 100%",
    products: [{ product_name: "Парки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "kids" }] },

  // ============================================================
  // 10. ТРИКОТАЖ (фуфайки/футболки 6109, свитеры/толстовки 6110)
  // ============================================================
  { section: "10. Трикотаж (футболки, свитеры, толстовки)", label: "Футболки хлопок 100%",
    products: [{ product_name: "Футболки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" }] },
  { section: "10. Трикотаж (футболки, свитеры, толстовки)", label: "Свитеры шерсть 100%",
    products: [{ product_name: "Свитеры", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "adults" }] },
  { section: "10. Трикотаж (футболки, свитеры, толстовки)", label: "Свитеры шерсть 60% акрил 40%",
    products: [{ product_name: "Свитеры", product_composition: "шерсть 60%, акрил 40%", production_type: "knit", gender_hint: "adults" }] },
  { section: "10. Трикотаж (футболки, свитеры, толстовки)", label: "Толстовки хлопок 100%",
    products: [{ product_name: "Толстовки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" }] },
  { section: "10. Трикотаж (футболки, свитеры, толстовки)", label: "Худи хлопок 100% (модель толстовки)",
    products: [{ product_name: "Худи", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" }] },
  { section: "10. Трикотаж (футболки, свитеры, толстовки)", label: "Свитшоты хлопок 100% (модель джемпера)",
    products: [{ product_name: "Свитшот", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" }] },
  { section: "10. Трикотаж (футболки, свитеры, толстовки)", label: "Кардиганы шерсть 100%",
    products: [{ product_name: "Кардиганы", product_composition: "шерсть 100%", production_type: "knit", gender_hint: "adults" }] },

  // ============================================================
  // 11. МУЛЬТИ-ПРОДУКТ (несколько товаров в одной декларации)
  // ============================================================
  { section: "11. Мульти-продукт", label: "Платья + Блузки женские (одинаковый состав)",
    products: [
      { product_name: "Платья", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "women" },
      { product_name: "Блузки", product_composition: "полиэстер 80%, вискоза 15%, эластан 5%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "11. Мульти-продукт", label: "Платья + Костюмы (оба ГОСТа)",
    products: [
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Костюмы", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "men" },
    ]},
  { section: "11. Мульти-продукт", label: "Блузки + Пиджак (твой кейс, оба ГОСТа)",
    products: [
      { product_name: "Блузки", product_composition: "хлопок 50%, лён 40%, полиэстер 10%", production_type: "woven", gender_hint: "women" },
      { product_name: "Пиджак", product_composition: "полиэстер 50%, хлопок 50%", production_type: "woven", gender_hint: "men" },
    ]},
  { section: "11. Мульти-продукт", label: "Куртки + Брюки мужские (3+2 слой)",
    products: [
      { product_name: "Куртки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "men" },
      { product_name: "Брюки", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "men" },
    ]},
  { section: "11. Мульти-продукт", label: "Платья + Сарафан (база + модель — должен схлопнуться)",
    products: [
      { product_name: "Платья", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Сарафан", product_composition: "лён 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "11. Мульти-продукт", label: "Брюки + Бриджи + Джинсы мужские (база + 2 модели)",
    products: [
      { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" },
      { product_name: "Бриджи", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" },
      { product_name: "Джинсы", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" },
    ]},
  { section: "11. Мульти-продукт", label: "Трусы + Боксеры + Слипы (бельё, база + 2 модели)",
    products: [
      { product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Боксеры", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Слипы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
    ]},
  { section: "11. Мульти-продукт", label: "Бельё детское — фуфайки + майки + пижамы (Памятка P15)",
    products: [
      { product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "kids" },
      { product_name: "Майки", product_composition: "акрил 80%, полиэстер 15%, эластан 5%", production_type: "knit", gender_hint: "kids" },
      { product_name: "Пижамы", product_composition: "модал 60%, полиэстер 30%, хлопок 10%", production_type: "knit", gender_hint: "kids" },
    ]},
];

// ============================================================
// Build DOCX table
// ============================================================

const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border };

function paragraph(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 18, color: opts.color })],
  });
}

function cell(children: Paragraph[], opts: { width?: number; columnSpan?: number; shading?: { fill: string; type: ShadingType } } = {}): TableCell {
  const props: ConstructorParameters<typeof TableCell>[0] = {
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: children.length ? children : [new Paragraph("")],
  };
  if (opts.width) props.width = { size: opts.width, type: WidthType.DXA };
  if (opts.columnSpan) props.columnSpan = opts.columnSpan;
  if (opts.shading) props.shading = opts.shading;
  return new TableCell(props);
}

const COL_WIDTHS = [500, 3000, 1700, 1300, 4860]; // total 11360 DXA (landscape content)

const rows: TableRow[] = [];

// Header row
rows.push(new TableRow({
  tableHeader: true,
  children: [
    cell([paragraph("№", { bold: true, size: 20 })], { width: COL_WIDTHS[0] }),
    cell([paragraph("Кейс / входные данные", { bold: true, size: 20 })], { width: COL_WIDTHS[1] }),
    cell([paragraph("Код ТН ВЭД", { bold: true, size: 20 })], { width: COL_WIDTHS[2] }),
    cell([paragraph("ГОСТ", { bold: true, size: 20 })], { width: COL_WIDTHS[3] }),
    cell([paragraph("Полное описание группы", { bold: true, size: 20 })], { width: COL_WIDTHS[4] }),
  ],
}));

let currentSection = "";
let num = 1;

for (const c of CASES) {
  if (c.section !== currentSection) {
    rows.push(new TableRow({
      children: [
        cell([paragraph(c.section, { bold: true, size: 20 })], {
          columnSpan: 5,
          shading: { fill: "D8E4F0", type: ShadingType.CLEAR },
        }),
      ],
    }));
    currentSection = c.section;
  }

  const composed = composeDeclaration({ products: c.products, brand_name: c.brand ?? "TestBrand" });

  // Input column — multi-line with each product
  const inputParas: Paragraph[] = [paragraph(c.label, { bold: true, size: 18 })];
  for (const p of c.products) {
    const genderLabel: Record<string, string> = {
      auto: "авто", women: "жен", men: "муж", kids: "детск", adults: "взросл",
    };
    const typeLabel = p.production_type === "knit" ? "трикотаж" : "швейн";
    inputParas.push(paragraph(`  • ${p.product_name} | ${typeLabel} | ${genderLabel[p.gender_hint]} | ${p.product_composition}`, { size: 16, color: "555555" }));
  }

  // ТН ВЭД codes (per product)
  const codes = c.products.map((p) => deriveTnVedCode(p) || "—");
  const codesParas = codes.map((code) => paragraph(code, { size: 18 }));

  // ГОСТ — shortform: just numbers
  const gostText = composed.gost_references_block
    .replace(/ГОСТ /g, "")
    .replace(/-2003 "[^"]+"/g, "")
    .replace(/\.\s*/g, " ")
    .trim() || "—";
  const gostParas = [paragraph(gostText, { size: 18 })];

  // Description
  const descParas = [paragraph(composed.product_group_description, { size: 16 })];

  rows.push(new TableRow({
    children: [
      cell([paragraph(String(num), { size: 18 })], { width: COL_WIDTHS[0] }),
      cell(inputParas, { width: COL_WIDTHS[1] }),
      cell(codesParas, { width: COL_WIDTHS[2] }),
      cell(gostParas, { width: COL_WIDTHS[3] }),
      cell(descParas, { width: COL_WIDTHS[4] }),
    ],
  }));
  num++;
}

const table = new Table({
  width: { size: 11360, type: WidthType.DXA },
  columnWidths: COL_WIDTHS,
  rows,
});

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 15840, height: 12240, orientation: "landscape" as never },
        margin: { top: 720, right: 720, bottom: 720, left: 720 },
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "Тестовая матрица декларации ТР ТС 017/2011", bold: true, size: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({
          text: `Сгенерировано: ${new Date().toLocaleString("ru-RU")} · Всего кейсов: ${CASES.length}`,
          italics: true, size: 20,
        })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({
          text: "Каждый кейс — ввод формы (товары + состав + тип + пол). Колонки: автогенерированный код ТН ВЭД (10 знаков) на каждый товар, ссылки на ГОСТ (динамически по составу позиций), полная сформированная фраза «Описание группы продукции» которая попадёт в декларацию.",
          italics: true, size: 18,
        })],
      }),
      table,
    ],
  }],
});

async function main() {
  mkdirSync("docs", { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync("docs/test-matrix.docx", buffer);
  console.log(`✓ docs/test-matrix.docx (${buffer.length} bytes, ${num - 1} cases)`);
}
main();
