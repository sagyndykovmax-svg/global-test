/**
 * FULL grid: every realistic item × gender × production × composition combo.
 * Output: docs/test-matrix-full.docx
 *
 * Items have realistic (gender × production) constraints (e.g., кальсоны только муж/трикотаж).
 * Materials: 6 representative compositions covering single material, blend, admixture, tie.
 *
 * Generates ~250-300 single-product cases + ~30 multi-product cases.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle,
} from "docx";
import { composeDeclaration, deriveTnVedCode } from "../src/templates/declaration-eaeu-light/compose";

type Gender = "women" | "men" | "kids" | "adults";
type Prod = "woven" | "knit";

type ItemDef = {
  name: string;
  section: string;
  genders: Gender[];
  prods: Prod[];
};

// ---- Items (representative items with their realistic gender × production combos) ----

const ITEMS: ItemDef[] = [
  // 1-й слой (бельё)
  { name: "Трусы", section: "1. Бельё 1-го слоя", genders: ["women", "men", "kids"], prods: ["knit"] },
  { name: "Майки", section: "1. Бельё 1-го слоя", genders: ["women", "men", "kids"], prods: ["knit"] },
  { name: "Пижамы", section: "1. Бельё 1-го слоя", genders: ["women", "men", "kids"], prods: ["knit"] },
  { name: "Сорочки ночные", section: "1. Бельё 1-го слоя", genders: ["women"], prods: ["knit", "woven"] },
  { name: "Кальсоны", section: "1. Бельё 1-го слоя", genders: ["men"], prods: ["knit"] },
  { name: "Боди", section: "1. Бельё 1-го слоя", genders: ["women", "kids"], prods: ["knit"] },
  { name: "Комбинации", section: "1. Бельё 1-го слоя", genders: ["women"], prods: ["woven"] },
  { name: "Панталоны", section: "1. Бельё 1-го слоя", genders: ["women"], prods: ["knit"] },
  { name: "Фуфайки", section: "1. Бельё 1-го слоя", genders: ["women", "men", "kids"], prods: ["knit"] },
  { name: "Футболки", section: "1. Бельё 1-го слоя (трикотаж)", genders: ["adults", "kids"], prods: ["knit"] },
  { name: "Бюстгальтеры", section: "1. Корсетные", genders: ["women"], prods: ["knit"] },

  // 2-й слой платьево-блузочный
  { name: "Платья", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven", "knit"] },
  { name: "Блузки", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven", "knit"] },
  { name: "Юбки", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven", "knit"] },
  { name: "Сарафан", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven"] },

  // 2-й слой костюмный
  { name: "Костюмы", section: "3. Костюмный (ГОСТ 25295)", genders: ["women", "men"], prods: ["woven"] },
  { name: "Пиджак", section: "3. Костюмный (ГОСТ 25295)", genders: ["men"], prods: ["woven"] },
  { name: "Жакеты", section: "3. Костюмный (ГОСТ 25295)", genders: ["women"], prods: ["woven"] },
  { name: "Жилеты", section: "3. Костюмный (ГОСТ 25295)", genders: ["women", "men"], prods: ["woven"] },

  // Брюки и варианты
  { name: "Брюки", section: "4. Брюки/шорты/комбинезоны", genders: ["women", "men", "kids"], prods: ["woven", "knit"] },
  { name: "Шорты", section: "4. Брюки/шорты/комбинезоны", genders: ["women", "men", "kids"], prods: ["woven"] },
  { name: "Комбинезоны", section: "4. Брюки/шорты/комбинезоны", genders: ["women", "men"], prods: ["woven", "knit"] },

  // Рубашки
  { name: "Рубашки", section: "5. Сорочки верхние", genders: ["men"], prods: ["woven"] },

  // 3-й слой (верхняя одежда пальтовая)
  { name: "Пальто", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men", "kids"], prods: ["woven"] },
  { name: "Куртки", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men", "kids"], prods: ["woven"] },
  { name: "Плащи", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men"], prods: ["woven"] },
  { name: "Шубы", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women"], prods: ["woven"] },
  { name: "Пуховики", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men", "kids"], prods: ["woven"] },

  // Трикотаж 2-го слоя
  { name: "Свитеры", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },
  { name: "Толстовки", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },
  { name: "Кардиганы", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },
  { name: "Джемперы", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },

  // Спортивная одежда
  { name: "Костюмы спортивные", section: "8. Спортивная одежда", genders: ["adults", "kids"], prods: ["knit", "woven"] },
];

const GENDER_LABEL: Record<Gender, string> = {
  women: "жен", men: "муж", kids: "детск", adults: "взрослых",
};

// ---- Materials (6 representative compositions) ----

const MATERIALS = [
  { label: "хлопок 100%", composition: "хлопок 100%" },
  { label: "шерсть 100%", composition: "шерсть 100%" },
  { label: "полиэстер 100%", composition: "полиэстер 100%" },
  { label: "хлопок 95% + эластан 5%", composition: "хлопок 95%, эластан 5%" },
  { label: "полиэстер 80% + вискоза 20%", composition: "полиэстер 80%, вискоза 20%" },
  { label: "шерсть 70% + полиэстер 30%", composition: "шерсть 70%, полиэстер 30%" },
  { label: "полиэстер 50% + хлопок 50% (тай)", composition: "полиэстер 50%, хлопок 50%" },
];

// ---- Build single-product cases ----

type Case = {
  section: string;
  label: string;
  products: Array<{ product_name: string; product_composition: string; production_type: Prod; gender_hint: Gender }>;
};

const cases: Case[] = [];

for (const item of ITEMS) {
  for (const gender of item.genders) {
    for (const prod of item.prods) {
      for (const mat of MATERIALS) {
        const typeWord = prod === "knit" ? "трикотаж" : "швейн";
        cases.push({
          section: item.section,
          label: `${item.name} | ${typeWord} | ${GENDER_LABEL[gender]} | ${mat.label}`,
          products: [{ product_name: item.name, product_composition: mat.composition, production_type: prod, gender_hint: gender }],
        });
      }
    }
  }
}

// ---- Multi-product strategic cases ----

const MULTI: Case[] = [
  // Cross-layer
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "Бельё + 2-й слой: Трусы жен трик + Платья жен швейн (хлопок)",
    products: [
      { product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" },
      { product_name: "Платья", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "1-й + 2-й + 3-й: Фуфайки жен + Платья жен + Пальто жен",
    products: [
      { product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" },
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Пальто", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "Жен+муж смесь → «для взрослых»: Платья жен + Рубашки муж",
    products: [
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Рубашки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" },
    ]},
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "Взрослые + дети → «для взрослых и детей»: Платья жен + Парки детск",
    products: [
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Парки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "kids" },
    ]},
  // База + 1 модель
  { section: "9. Мульти-продукт (база + модель)", label: "Платья + Сарафан жен (база + 1 модель)",
    products: [
      { product_name: "Платья", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Сарафан", product_composition: "лён 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Трусы + Боксеры + Слипы + Стринги муж (1 база + 3 модели)",
    products: [
      { product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Боксеры", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Слипы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Стринги", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Брюки + Бриджи + Джинсы + Капри жен (база + 3 модели)",
    products: [
      { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Бриджи", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Джинсы", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Капри", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Толстовки + Худи (база + 1 модель)",
    products: [
      { product_name: "Толстовки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
      { product_name: "Худи", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Джемперы + Свитшоты (база + 1 модель)",
    products: [
      { product_name: "Джемперы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
      { product_name: "Свитшот", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
    ]},
  // Памятка P15
  { section: "9. Мульти-продукт (памятка P15)", label: "Памятка P15: Фуфайки + Майки + Пижамы детск с 3 разными составами",
    products: [
      { product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "kids" },
      { product_name: "Майки", product_composition: "акрил 80%, полиэстер 15%, эластан 5%", production_type: "knit", gender_hint: "kids" },
      { product_name: "Пижамы", product_composition: "модал 60%, полиэстер 30%, хлопок 10%", production_type: "knit", gender_hint: "kids" },
    ]},
  // Граничные проценты
  { section: "10. Граничные проценты", label: "Шерсть 30% + полиэстер 70% (порог «полушерстяная»)",
    products: [{ product_name: "Брюки", product_composition: "шерсть 30%, полиэстер 70%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Шерсть 29% + полиэстер 71% (НЕ полушерстяная)",
    products: [{ product_name: "Брюки", product_composition: "шерсть 29%, полиэстер 71%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Лён 30% + хлопок 70% (порог льна)",
    products: [{ product_name: "Платья", product_composition: "лён 30%, хлопок 70%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Лён 29% + хлопок 71% (НЕ полульняная)",
    products: [{ product_name: "Платья", product_composition: "лён 29%, хлопок 71%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Хлопок 51% + полиэстер 49% (хлопок чуть-чуть доминирует)",
    products: [{ product_name: "Блузки", product_composition: "хлопок 51%, полиэстер 49%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Хлопок 50% + полиэстер 50% (тай)",
    products: [{ product_name: "Блузки", product_composition: "хлопок 50%, полиэстер 50%", production_type: "woven", gender_hint: "women" }]},
  // Edge materials
  { section: "11. Редкие материалы", label: "Кашемир 100% (группируется как шерсть)",
    products: [{ product_name: "Свитеры", product_composition: "кашемир 100%", production_type: "knit", gender_hint: "adults" }]},
  { section: "11. Редкие материалы", label: "Мохер 80% + полиэстер 20%",
    products: [{ product_name: "Кардиганы", product_composition: "мохер 80%, полиэстер 20%", production_type: "knit", gender_hint: "adults" }]},
  { section: "11. Редкие материалы", label: "Шёлк 50% + шерсть 50% (тай два натуральных)",
    products: [{ product_name: "Блузки", product_composition: "шёлк 50%, шерсть 50%", production_type: "woven", gender_hint: "women" }]},
  { section: "11. Редкие материалы", label: "4 категории: хлопок 35% + вискоза 25% + полиэстер 25% + шерсть 15%",
    products: [{ product_name: "Платья", product_composition: "хлопок 35%, вискоза 25%, полиэстер 25%, шерсть 15%", production_type: "woven", gender_hint: "women" }]},
  { section: "11. Редкие материалы", label: "Микрофибра 100% (синтетика)",
    products: [{ product_name: "Куртки", product_composition: "микрофибра 100%", production_type: "woven", gender_hint: "men" }]},
];

cases.push(...MULTI);

// ============================================================
// Build DOCX
// ============================================================

const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border };

function paragraph(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 30 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 16, color: opts.color })],
  });
}

function cell(children: Paragraph[], opts: { width?: number; columnSpan?: number; shading?: { fill: string; type: ShadingType } } = {}): TableCell {
  const props: ConstructorParameters<typeof TableCell>[0] = {
    borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: children.length ? children : [new Paragraph("")],
  };
  if (opts.width) props.width = { size: opts.width, type: WidthType.DXA };
  if (opts.columnSpan) props.columnSpan = opts.columnSpan;
  if (opts.shading) props.shading = opts.shading;
  return new TableCell(props);
}

const COL_WIDTHS = [400, 3200, 1600, 1100, 5000]; // total 11300 DXA landscape

const rows: TableRow[] = [];

rows.push(new TableRow({
  tableHeader: true,
  children: [
    cell([paragraph("№", { bold: true, size: 18 })], { width: COL_WIDTHS[0] }),
    cell([paragraph("Кейс / входные данные", { bold: true, size: 18 })], { width: COL_WIDTHS[1] }),
    cell([paragraph("Код ТН ВЭД", { bold: true, size: 18 })], { width: COL_WIDTHS[2] }),
    cell([paragraph("ГОСТ", { bold: true, size: 18 })], { width: COL_WIDTHS[3] }),
    cell([paragraph("Описание группы продукции", { bold: true, size: 18 })], { width: COL_WIDTHS[4] }),
  ],
}));

let currentSection = "";
let num = 1;

for (const c of cases) {
  if (c.section !== currentSection) {
    rows.push(new TableRow({
      children: [
        cell([paragraph(c.section, { bold: true, size: 18 })], {
          columnSpan: 5,
          shading: { fill: "D8E4F0", type: ShadingType.CLEAR },
        }),
      ],
    }));
    currentSection = c.section;
  }

  const composed = composeDeclaration({ products: c.products, brand_name: "TestBrand" });

  const inputParas: Paragraph[] = [];
  if (c.products.length === 1) {
    inputParas.push(paragraph(c.label, { size: 16 }));
  } else {
    inputParas.push(paragraph(c.label, { bold: true, size: 16 }));
    for (const p of c.products) {
      const t = p.production_type === "knit" ? "трикотаж" : "швейн";
      inputParas.push(paragraph(`  • ${p.product_name} (${t}, ${GENDER_LABEL[p.gender_hint]}) — ${p.product_composition}`, { size: 14, color: "555555" }));
    }
  }

  const codes = c.products.map((p) => deriveTnVedCode(p) || "—");
  const codesParas = codes.map((code) => paragraph(code, { size: 16 }));

  const gostText = composed.gost_references_block
    .replace(/ГОСТ /g, "")
    .replace(/-2003 "[^"]+"/g, "")
    .replace(/\.\s*/g, " ")
    .trim() || "—";

  rows.push(new TableRow({
    children: [
      cell([paragraph(String(num), { size: 16 })], { width: COL_WIDTHS[0] }),
      cell(inputParas, { width: COL_WIDTHS[1] }),
      cell(codesParas, { width: COL_WIDTHS[2] }),
      cell([paragraph(gostText, { size: 16 })], { width: COL_WIDTHS[3] }),
      cell([paragraph(composed.product_group_description, { size: 14 })], { width: COL_WIDTHS[4] }),
    ],
  }));
  num++;
}

const table = new Table({
  width: { size: 11300, type: WidthType.DXA },
  columnWidths: COL_WIDTHS,
  rows,
});

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 18 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 15840, height: 12240, orientation: "landscape" as never },
        margin: { top: 540, right: 540, bottom: 540, left: 540 },
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "Полная тестовая матрица декларации ТР ТС 017/2011", bold: true, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({
          text: `Сгенерировано: ${new Date().toLocaleString("ru-RU")}  ·  Всего кейсов: ${cases.length}  ·  ${ITEMS.length} типов изделий × ${MATERIALS.length} материалов + мульти-продукт + edge-cases`,
          italics: true, size: 16,
        })],
      }),
      table,
    ],
  }],
});

async function main() {
  mkdirSync("docs", { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  const out = process.env.MATRIX_OUT || "docs/test-matrix-full.docx";
  writeFileSync(out, buffer);
  console.log(`✓ ${out} (${buffer.length} bytes, ${num - 1} cases)`);
}
main();
