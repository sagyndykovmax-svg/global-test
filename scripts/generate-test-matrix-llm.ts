/**
 * Generate test matrix using REAL hybrid (LLM + EAEU override) classification.
 *
 * Calls Gemini API for each case. Free tier limit: 15 RPM → 4 sec delay between calls.
 * 505 cases × ~4 sec = ~34 minutes.
 *
 * Caches results in docs/test-matrix-cache.json — resume if interrupted.
 * Re-run safe — only un-cached cases hit the API.
 *
 * Output: docs/test-matrix-full.docx (overwrites previous rule-based version).
 *
 * Run:
 *   npx tsx scripts/generate-test-matrix-llm.ts          — all 505 cases
 *   npx tsx scripts/generate-test-matrix-llm.ts --limit 50 — first 50 only (for testing)
 *   npx tsx scripts/generate-test-matrix-llm.ts --rule-only — no LLM, fast (rule-based only)
 */
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle,
} from "docx";
import { composeDeclaration, deriveTnVedCode, type ProductRow } from "../src/templates/declaration-eaeu-light/compose";
import { classifyTnVedWithLLM } from "../src/lib/tnved-llm";

const args = process.argv.slice(2);
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? Number(args[i + 1]) : Infinity;
})();
const RULE_ONLY = args.includes("--rule-only");
const RATE_LIMIT_MS = 4000; // 15 RPM → 4 sec/call (safe margin)
const CACHE_PATH = "docs/test-matrix-cache.json";

type CacheEntry = { code: string; source: string; rationale?: string };
let cache: Record<string, CacheEntry> = {};
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    console.log(`Loaded ${Object.keys(cache).length} cached entries from ${CACHE_PATH}`);
  } catch {
    cache = {};
  }
}

function saveCache() {
  mkdirSync("docs", { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function rowKey(row: ProductRow): string {
  return JSON.stringify({
    n: row.product_name,
    c: row.product_composition,
    t: row.production_type,
    g: row.gender_hint,
  });
}

async function classifyHybrid(row: ProductRow): Promise<CacheEntry> {
  const key = rowKey(row);
  if (cache[key]) return cache[key];

  const ruleCode = deriveTnVedCode(row);

  if (RULE_ONLY) {
    // Не пишем в кэш — rule-based вычисляется мгновенно и не должен
    // блокировать будущие LLM-запросы для этих же inputs.
    return { code: ruleCode || "", source: "rule" };
  }

  const llmResult = await classifyTnVedWithLLM(row);
  let result: CacheEntry;
  let cacheable = false;
  if (llmResult && ruleCode) {
    const llmFirst6 = llmResult.code.slice(0, 6);
    const ruleFirst6 = ruleCode.slice(0, 6);
    const ruleLast4 = ruleCode.slice(6);
    if (llmFirst6 === ruleFirst6 && ruleLast4 !== "0000") {
      result = { code: ruleCode, source: "llm-eaeu-refined", rationale: llmResult.rationale };
    } else {
      result = { code: llmResult.code, source: llmResult.source, rationale: llmResult.rationale };
    }
    cacheable = true;
  } else if (llmResult) {
    result = { code: llmResult.code, source: llmResult.source, rationale: llmResult.rationale };
    cacheable = true;
  } else {
    // LLM упал (429, таймаут, etc.) → возвращаем rule-based, но НЕ кэшируем
    // чтобы при следующем запуске была попытка LLM-классификации
    result = { code: ruleCode || "", source: "rule" };
  }

  if (cacheable) {
    cache[key] = result;
    saveCache();
  }
  return result;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---- Build case definitions (same as generate-test-matrix-full.ts) ----

type Gender = "women" | "men" | "kids" | "adults";
type Prod = "woven" | "knit";

type ItemDef = { name: string; section: string; genders: Gender[]; prods: Prod[] };

const ITEMS: ItemDef[] = [
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

  { name: "Платья", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven", "knit"] },
  { name: "Блузки", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven", "knit"] },
  { name: "Юбки", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven", "knit"] },
  { name: "Сарафан", section: "2. Платьево-блузочный (ГОСТ 25294)", genders: ["women"], prods: ["woven"] },

  { name: "Костюмы", section: "3. Костюмный (ГОСТ 25295)", genders: ["women", "men"], prods: ["woven"] },
  { name: "Пиджак", section: "3. Костюмный (ГОСТ 25295)", genders: ["men"], prods: ["woven"] },
  { name: "Жакеты", section: "3. Костюмный (ГОСТ 25295)", genders: ["women"], prods: ["woven"] },
  { name: "Жилеты", section: "3. Костюмный (ГОСТ 25295)", genders: ["women", "men"], prods: ["woven"] },

  { name: "Брюки", section: "4. Брюки/шорты/комбинезоны", genders: ["women", "men", "kids"], prods: ["woven", "knit"] },
  { name: "Шорты", section: "4. Брюки/шорты/комбинезоны", genders: ["women", "men", "kids"], prods: ["woven"] },
  { name: "Комбинезоны", section: "4. Брюки/шорты/комбинезоны", genders: ["women", "men"], prods: ["woven", "knit"] },

  { name: "Рубашки", section: "5. Сорочки верхние", genders: ["men"], prods: ["woven"] },

  { name: "Пальто", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men", "kids"], prods: ["woven"] },
  { name: "Куртки", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men", "kids"], prods: ["woven"] },
  { name: "Плащи", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men"], prods: ["woven"] },
  { name: "Шубы", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women"], prods: ["woven"] },
  { name: "Пуховики", section: "6. 3-й слой пальтовый (ГОСТ 25295)", genders: ["women", "men", "kids"], prods: ["woven"] },

  { name: "Свитеры", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },
  { name: "Толстовки", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },
  { name: "Кардиганы", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },
  { name: "Джемперы", section: "7. Трикотаж 2-го слоя", genders: ["adults"], prods: ["knit"] },

  { name: "Костюмы спортивные", section: "8. Спортивная одежда", genders: ["adults", "kids"], prods: ["knit", "woven"] },
];

const GENDER_LABEL: Record<Gender, string> = {
  women: "жен", men: "муж", kids: "детск", adults: "взрослых",
};

const MATERIALS = [
  { label: "хлопок 100%", composition: "хлопок 100%" },
  { label: "шерсть 100%", composition: "шерсть 100%" },
  { label: "полиэстер 100%", composition: "полиэстер 100%" },
  { label: "хлопок 95% + эластан 5%", composition: "хлопок 95%, эластан 5%" },
  { label: "полиэстер 80% + вискоза 20%", composition: "полиэстер 80%, вискоза 20%" },
  { label: "шерсть 70% + полиэстер 30%", composition: "шерсть 70%, полиэстер 30%" },
  { label: "полиэстер 50% + хлопок 50% (тай)", composition: "полиэстер 50%, хлопок 50%" },
];

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

// Multi-product strategic cases
const MULTI: Case[] = [
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "Трусы жен трик + Платья жен швейн (хлопок)",
    products: [
      { product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" },
      { product_name: "Платья", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "1+2+3 слой: Фуфайки + Платья + Пальто жен",
    products: [
      { product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "women" },
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Пальто", product_composition: "шерсть 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "Жен+муж → «для взрослых»",
    products: [
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Рубашки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "men" },
    ]},
  { section: "9. Мульти-продукт (кросс-слой/гендер)", label: "Взрослые + дети → «для взрослых и детей»",
    products: [
      { product_name: "Платья", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Парки", product_composition: "полиэстер 100%", production_type: "woven", gender_hint: "kids" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Платья + Сарафан жен",
    products: [
      { product_name: "Платья", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Сарафан", product_composition: "лён 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Трусы + Боксеры + Слипы + Стринги муж",
    products: [
      { product_name: "Трусы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Боксеры", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Слипы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
      { product_name: "Стринги", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "men" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Брюки + Бриджи + Джинсы + Капри жен",
    products: [
      { product_name: "Брюки", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Бриджи", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Джинсы", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
      { product_name: "Капри", product_composition: "хлопок 100%", production_type: "woven", gender_hint: "women" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Толстовки + Худи",
    products: [
      { product_name: "Толстовки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
      { product_name: "Худи", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
    ]},
  { section: "9. Мульти-продукт (база + модель)", label: "Джемперы + Свитшоты",
    products: [
      { product_name: "Джемперы", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
      { product_name: "Свитшот", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "adults" },
    ]},
  { section: "9. Мульти-продукт (памятка P15)", label: "Памятка P15: бельё детск с 3 разными составами",
    products: [
      { product_name: "Фуфайки", product_composition: "хлопок 100%", production_type: "knit", gender_hint: "kids" },
      { product_name: "Майки", product_composition: "акрил 80%, полиэстер 15%, эластан 5%", production_type: "knit", gender_hint: "kids" },
      { product_name: "Пижамы", product_composition: "модал 60%, полиэстер 30%, хлопок 10%", production_type: "knit", gender_hint: "kids" },
    ]},
  { section: "10. Граничные проценты", label: "Шерсть 30% + полиэстер 70%",
    products: [{ product_name: "Брюки", product_composition: "шерсть 30%, полиэстер 70%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Шерсть 29% + полиэстер 71%",
    products: [{ product_name: "Брюки", product_composition: "шерсть 29%, полиэстер 71%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Лён 30% + хлопок 70%",
    products: [{ product_name: "Платья", product_composition: "лён 30%, хлопок 70%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Лён 29% + хлопок 71%",
    products: [{ product_name: "Платья", product_composition: "лён 29%, хлопок 71%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Хлопок 51% + полиэстер 49%",
    products: [{ product_name: "Блузки", product_composition: "хлопок 51%, полиэстер 49%", production_type: "woven", gender_hint: "women" }]},
  { section: "10. Граничные проценты", label: "Хлопок 50% + полиэстер 50% (тай)",
    products: [{ product_name: "Блузки", product_composition: "хлопок 50%, полиэстер 50%", production_type: "woven", gender_hint: "women" }]},
  { section: "11. Редкие материалы", label: "Кашемир 100%",
    products: [{ product_name: "Свитеры", product_composition: "кашемир 100%", production_type: "knit", gender_hint: "adults" }]},
  { section: "11. Редкие материалы", label: "Мохер 80% + полиэстер 20%",
    products: [{ product_name: "Кардиганы", product_composition: "мохер 80%, полиэстер 20%", production_type: "knit", gender_hint: "adults" }]},
  { section: "11. Редкие материалы", label: "Шёлк 50% + шерсть 50% (тай)",
    products: [{ product_name: "Блузки", product_composition: "шёлк 50%, шерсть 50%", production_type: "woven", gender_hint: "women" }]},
  { section: "11. Редкие материалы", label: "4 категории",
    products: [{ product_name: "Платья", product_composition: "хлопок 35%, вискоза 25%, полиэстер 25%, шерсть 15%", production_type: "woven", gender_hint: "women" }]},
  { section: "11. Редкие материалы", label: "Микрофибра 100%",
    products: [{ product_name: "Куртки", product_composition: "микрофибра 100%", production_type: "woven", gender_hint: "men" }]},
];
cases.push(...MULTI);

// ---- Classification phase ----

type EnrichedCase = Case & { codes: CacheEntry[]; composed: ReturnType<typeof composeDeclaration> };

async function classifyAllCases(): Promise<EnrichedCase[]> {
  const total = Math.min(cases.length, LIMIT);
  const result: EnrichedCase[] = [];
  let apiCalls = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i++) {
    const c = cases[i];
    const codes: CacheEntry[] = [];
    for (const p of c.products) {
      const cached = cache[rowKey(p)];
      if (!cached) {
        codes.push(await classifyHybrid(p));
        apiCalls++;
        // Rate limit only when we actually hit the API
        if (!RULE_ONLY && apiCalls > 0) {
          await sleep(RATE_LIMIT_MS);
        }
      } else {
        codes.push(cached);
      }
    }
    const composed = composeDeclaration({ products: c.products, brand_name: "TestBrand" });
    result.push({ ...c, codes, composed });

    if ((i + 1) % 10 === 0 || i + 1 === total) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = apiCalls / Math.max(elapsed, 1);
      const remaining = (total - i - 1);
      const eta = apiCalls > 0 ? Math.round(remaining * RATE_LIMIT_MS / 1000) : 0;
      console.log(`[${i + 1}/${total}] API calls: ${apiCalls} | elapsed: ${Math.round(elapsed)}s | ETA: ${eta}s`);
    }
  }
  return result;
}

// ---- Build DOCX ----

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

const COL_WIDTHS = [400, 3000, 1700, 1100, 5100];

function buildDoc(enriched: EnrichedCase[]): Document {
  const rows: TableRow[] = [];
  rows.push(new TableRow({
    tableHeader: true,
    children: [
      cell([paragraph("№", { bold: true, size: 18 })], { width: COL_WIDTHS[0] }),
      cell([paragraph("Кейс / входные данные", { bold: true, size: 18 })], { width: COL_WIDTHS[1] }),
      cell([paragraph("Код ТН ВЭД (источник)", { bold: true, size: 18 })], { width: COL_WIDTHS[2] }),
      cell([paragraph("ГОСТ", { bold: true, size: 18 })], { width: COL_WIDTHS[3] }),
      cell([paragraph("Описание группы продукции", { bold: true, size: 18 })], { width: COL_WIDTHS[4] }),
    ],
  }));

  let currentSection = "";
  let num = 1;

  const sourceLabel: Record<string, string> = {
    "llm": "ЕАЭС",
    "llm-eaeu-refined": "ЕАЭС+EAEU",
    "rule": "rule",
    "fallback": "rule",
  };

  for (const c of enriched) {
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

    const inputParas: Paragraph[] = [];
    if (c.products.length === 1) {
      inputParas.push(paragraph(c.label, { size: 16 }));
    } else {
      inputParas.push(paragraph(c.label, { bold: true, size: 16 }));
      const gMap: Record<string, string> = { auto: "авто", women: "жен", men: "муж", kids: "детск", adults: "взросл" };
      for (const p of c.products) {
        const t = p.production_type === "knit" ? "трикотаж" : "швейн";
        inputParas.push(paragraph(`  • ${p.product_name} (${t}, ${gMap[p.gender_hint] ?? p.gender_hint}) — ${p.product_composition}`, { size: 14, color: "555555" }));
      }
    }

    const codesParas: Paragraph[] = [];
    for (const e of c.codes) {
      const tag = sourceLabel[e.source] ?? e.source;
      codesParas.push(paragraph(`${e.code || "—"}  [${tag}]`, { size: 16 }));
    }

    const gostText = c.composed.gost_references_block
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
        cell([paragraph(c.composed.product_group_description, { size: 14 })], { width: COL_WIDTHS[4] }),
      ],
    }));
    num++;
  }

  return new Document({
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
          children: [new TextRun({ text: "Полная тестовая матрица — ТН ВЭД по справочнику ЕАЭС (Gemini API)", bold: true, size: 28 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [new TextRun({
            text: `Сгенерировано: ${new Date().toLocaleString("ru-RU")}  ·  Всего кейсов: ${enriched.length}  ·  Источник кода: ЕАЭС=Gemini LLM, EAEU=ручной override для специфики, rule=fallback`,
            italics: true, size: 16,
          })],
        }),
        new Table({
          width: { size: 11300, type: WidthType.DXA },
          columnWidths: COL_WIDTHS,
          rows,
        }),
      ],
    }],
  });
}

async function main() {
  console.log(`Mode: ${RULE_ONLY ? "RULE-BASED only" : "Hybrid LLM + EAEU"} | cases: ${Math.min(cases.length, LIMIT)} | rate limit: ${RATE_LIMIT_MS}ms`);
  if (!RULE_ONLY && !process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("ERROR: no LLM API key set. Use --rule-only or set GEMINI_API_KEY in .env");
    process.exit(1);
  }

  const enriched = await classifyAllCases();
  const doc = buildDoc(enriched);
  const buffer = await Packer.toBuffer(doc);
  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/test-matrix-full.docx", buffer);
  console.log(`\n✓ docs/test-matrix-full.docx (${buffer.length} bytes, ${enriched.length} cases)`);
  console.log(`Cache saved: ${CACHE_PATH} (${Object.keys(cache).length} entries)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  saveCache(); // try to save what we have
  process.exit(1);
});
