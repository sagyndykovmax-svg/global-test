/**
 * Generates a reference docx dictionary mapping common fabric/yarn compositions
 * to the formulation phrase used in the declaration template.
 *
 * Output: docs/composition-dictionary.docx
 *
 * Run: node scripts/generate-dictionary.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, HeadingLevel, AlignmentType, BorderStyle,
} from "docx";

const SECTIONS = [
  {
    title: "1. Чистые материалы (100%)",
    entries: [
      ["Хлопок 100%", "из ткани из хлопковых волокон"],
      ["Лён 100%", "из ткани из льняных волокон"],
      ["Шерсть 100%", "из ткани из шерстяных волокон"],
      ["Шёлк 100%", "из ткани из шёлковых волокон"],
      ["Полиэстер 100%", "из ткани из синтетических нитей"],
      ["Нейлон 100%", "из ткани из синтетических нитей"],
      ["Акрил 100%", "из ткани из синтетических нитей"],
      ["Вискоза 100%", "из ткани из искусственных волокон"],
      ["Модал 100%", "из ткани из искусственных волокон"],
    ],
  },
  {
    title: "2. Натуральный материал с синтетической/искусственной примесью (натурального ≥50%)",
    entries: [
      ["Хлопок 95%, эластан 5%", "из ткани из хлопковых волокон с вложением синтетических нитей"],
      ["Хлопок 90%, эластан 10%", "из ткани из хлопковых волокон с вложением синтетических нитей"],
      ["Хлопок 95%, полиэстер 5%", "из ткани из хлопковых волокон с вложением синтетических нитей"],
      ["Хлопок 80%, полиэстер 20%", "из ткани из хлопковых волокон с вложением синтетических нитей"],
      ["Хлопок 80%, вискоза 20%", "из ткани из хлопковых волокон с вложением искусственных волокон"],
      ["Шерсть 80%, эластан 20%", "из ткани из шерстяных волокон с вложением синтетических нитей"],
      ["Шерсть 70%, полиэстер 30%", "из ткани из шерстяных волокон с вложением синтетических нитей"],
      ["Шерсть 60%, вискоза 40%", "из ткани из шерстяных волокон с вложением искусственных волокон"],
      ["Лён 80%, эластан 20%", "из ткани из льняных волокон с вложением синтетических нитей"],
      ["Лён 60%, вискоза 40%", "из ткани из льняных волокон с вложением искусственных волокон"],
      ["Шёлк 90%, эластан 10%", "из ткани из шёлковых волокон с вложением синтетических нитей"],
    ],
  },
  {
    title: "3. Смесь натуральных волокон (без синтетической примеси)",
    entries: [
      ["Шерсть 60%, хлопок 40%", "из ткани из смеси шерстяных и хлопковых волокон"],
      ["Шерсть 80%, шёлк 20%", "из ткани из смеси шерстяных и шёлковых волокон"],
      ["Хлопок 60%, лён 40%", "из ткани из смеси хлопковых и льняных волокон"],
      ["Хлопок 70%, шёлк 30%", "из ткани из смеси хлопковых и шёлковых волокон"],
      ["Лён 50%, шёлк 50%", "из ткани из смеси льняных и шёлковых волокон"],
    ],
  },
  {
    title: "4. Смесь натуральных с синтетической/искусственной примесью",
    entries: [
      ["Шерсть 70%, хлопок 25%, спандекс 5%", "из ткани из смеси шерстяных и хлопковых волокон с вложением синтетических нитей"],
      ["Шерсть 60%, хлопок 30%, эластан 10%", "из ткани из смеси шерстяных и хлопковых волокон с вложением синтетических нитей"],
      ["Хлопок 60%, лён 30%, эластан 10%", "из ткани из смеси хлопковых и льняных волокон с вложением синтетических нитей"],
      ["Шерсть 60%, хлопок 30%, вискоза 10%", "из ткани из смеси шерстяных и хлопковых волокон с вложением искусственных волокон"],
      ["Шерсть 50%, хлопок 35%, полиэстер 10%, эластан 5%", "из ткани из смеси шерстяных и хлопковых волокон с вложением синтетических нитей"],
    ],
  },
  {
    title: "5. Синтетико-/искусственно-доминантные смеси (натурального <50%)",
    entries: [
      ["Полиэстер 80%, вискоза 20%", "из ткани сочетания синтетических нитей и искусственных волокон"],
      ["Полиэстер 80%, вискоза 15%, эластан 5%", "из ткани сочетания синтетических нитей и искусственных волокон"],
      ["Полиэстер 50%, вискоза 50%", "из ткани сочетания синтетических нитей и искусственных волокон"],
      ["Полиэстер 60%, хлопок 40%", "из ткани сочетания синтетических нитей и хлопковых волокон"],
      ["Полиэстер 70%, шерсть 30%", "из ткани сочетания синтетических нитей и шерстяных волокон"],
      ["Полиэстер 95%, эластан 5%", "из ткани из синтетических нитей"],
      ["Полиэстер 50%, нейлон 50%", "из ткани из синтетических нитей"],
      ["Вискоза 70%, полиэстер 30%", "из ткани сочетания синтетических нитей и искусственных волокон"],
      ["Вискоза 60%, ацетат 40%", "из ткани из искусственных волокон"],
    ],
  },
];

// ---------- Build table ----------

const COL_WIDTHS = [800, 3800, 4760]; // total 9360 DXA = content width for US letter w/ 1" margins
const border = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, opts = {}) {
  const cellProps = {
    borders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20 })],
      }),
    ],
  };
  if (opts.width) cellProps.width = { size: opts.width, type: WidthType.DXA };
  if (opts.columnSpan) cellProps.columnSpan = opts.columnSpan;
  if (opts.shading) cellProps.shading = opts.shading;
  return new TableCell(cellProps);
}

const rows = [];

// Header
rows.push(new TableRow({
  children: [
    cell("№", { width: COL_WIDTHS[0], bold: true, size: 22 }),
    cell("Состав ткани/пряжи", { width: COL_WIDTHS[1], bold: true, size: 22 }),
    cell("Формулировка по ГОСТ", { width: COL_WIDTHS[2], bold: true, size: 22 }),
  ],
}));

let num = 1;
for (const section of SECTIONS) {
  // Section divider — spans 3 columns
  rows.push(new TableRow({
    children: [
      cell(section.title, {
        columnSpan: 3,
        bold: true,
        size: 22,
        shading: { fill: "E0E8F0", type: ShadingType.CLEAR },
      }),
    ],
  }));
  for (const [composition, formulation] of section.entries) {
    rows.push(new TableRow({
      children: [
        cell(String(num), { width: COL_WIDTHS[0] }),
        cell(composition, { width: COL_WIDTHS[1] }),
        cell(formulation, { width: COL_WIDTHS[2] }),
      ],
    }));
    num++;
  }
}

const table = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: COL_WIDTHS,
  rows,
});

// ---------- Build document ----------

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "Словарь составов и формулировок", bold: true, size: 32 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "Для декларации соответствия по ТР ТС 017/2011 (лёгкая промышленность)",
            italics: true,
            size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "Колонка «Формулировка» показана для ткани (швейные изделия). " +
                  "Для пряжи (трикотажные изделия) замените «из ткани» на «из пряжи» " +
                  "— остальная фраза не меняется.",
            italics: true,
            size: 20,
          }),
        ],
      }),
      table,
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "Правила формирования формулировки:",
            bold: true,
            size: 22,
          }),
        ],
      }),
      ...[
        "1 категория волокон (например, 100% хлопок) → «из ткани из <материал> волокон» (или «из синтетических нитей» для синтетики)",
        "Натуральные ≥ 50% + синтетика/искусственные → «из ткани из <натурального> волокон с вложением <примеси>»",
        "Несколько натуральных + примесь → «из ткани из смеси <нат1> и <нат2> волокон [с вложением <примеси>]»",
        "Синтетика/искусственные >50% → «из ткани сочетания <списка категорий>»",
      ].map((t) => new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: "• " + t, size: 20 })],
      })),
    ],
  }],
});

mkdirSync("docs", { recursive: true });
const buffer = await Packer.toBuffer(doc);
writeFileSync("docs/composition-dictionary.docx", buffer);
console.log(`✓ Saved docs/composition-dictionary.docx (${buffer.length} bytes, ${num - 1} entries across ${SECTIONS.length} sections)`);
