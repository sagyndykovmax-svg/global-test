/**
 * Composer for ТР ТС 017/2011 declaration text, per the official методика памятка
 * (см. docs/памятка_методика_формулировок.docx).
 *
 * Output structure:
 *   Изделия {слой} {производство} {fabric_phrase1}[, {fabric_phrase2}…]
 *   {gender_phrase}, в комплектах и отдельными предметами: {assortment_list},
 *   с маркировкой «{brand}»
 *
 * Where fabric_phrase carries the material classification with composition in parens.
 *
 * Source ГОСТы embedded as rules:
 *   - ГОСТ 28000-2004 (ткани шерстяные)
 *   - ГОСТ 15968-2014 (ткани льняные одежные)
 *   - ГОСТ 10138-93 (ткани льняные бельевые)
 *   - ГОСТ 4.419-86 (пряжа льняная)
 *   - ГОСТ 17037-2022 (термины швейных/трикотажных изделий)
 *   - ГОСТ 13784-94 (волокна и нити)
 */

// ============================================================
// Types
// ============================================================

export type ProductionType = "woven" | "knit";
export type ItemGender = "auto" | "women" | "men" | "kids" | "adults";
export type Layer = "1" | "2" | "3";

export type ProductRow = {
  tn_ved_code?: string;
  product_name?: string;
  product_composition?: string;
  production_type?: ProductionType;
  gender_hint?: ItemGender;
  lining_over_40?: boolean; // если true → 3-й слой
};

export type GenderHint = ItemGender;  // back-compat

export type ComposeArgs = {
  products: ProductRow[];
  brand_name?: string;
};

export type ComposedDeclaration = {
  product_group_description: string;
  product_group_intro: string;
  gost_references_block: string;
  has_appendix: string;
  kod_tn_ved_line: string;
};

// ============================================================
// Material taxonomy
// ============================================================

type Category = "synthetic" | "artificial" | "wool" | "cotton" | "linen" | "silk";

const CATEGORY_KEYWORDS: Record<Category, RegExp> = {
  synthetic: /(полиэстер|полиэфир|нейлон|акрил|эластан|спандекс|полиамид|полипропилен|лайкра|микрофибра)/i,
  artificial: /(вискоза|ацетат|модал|лиоцелл|купро|тенсель|бамбук)/i,
  wool: /(шерсть|шерстян|кашемир|мохер|ангора|альпака|верблюж|меринос)/i,
  cotton: /(хлопок|хлопчатобумажн|коттон)/i,
  linen: /(л(?:[её])н|льнян)/i,
  silk: /(ш(?:[её])лк)/i,
};

// Genitive plural adjective (для "из X волокон/нитей")
const ADJ_GEN: Record<Category, string> = {
  synthetic: "синтетических",
  artificial: "искусственных",
  wool: "шерстяных",
  cotton: "хлопковых",
  linen: "льняных",
  silk: "шёлковых",
};

// Instrumental plural adjective (для "с/в смеси с X нитями/волокнами")
const ADJ_INST: Record<Category, string> = {
  synthetic: "синтетическими",
  artificial: "искусственными",
  wool: "шерстяными",
  cotton: "хлопковыми",
  linen: "льняными",
  silk: "шёлковыми",
};

// Tail ("волокон" / "нитей") по падежам
const TAIL_GEN: Record<Category, string> = {
  synthetic: "нитей",
  artificial: "волокон",
  wool: "волокон",
  cotton: "волокон",
  linen: "волокон",
  silk: "волокон",
};

const TAIL_INST: Record<Category, string> = {
  synthetic: "нитями",
  artificial: "волокнами",
  wool: "волокнами",
  cotton: "волокнами",
  linen: "волокнами",
  silk: "волокнами",
};

// Какие категории относятся к «нитям», а какие — к «волокнам»
function isNitiCat(c: Category): boolean {
  return c === "synthetic";
}

// ============================================================
// Composition parsing
// ============================================================

export type MatEntry = { name: string; pct: number; cat: Category };

export function parseCompositionEntries(s: string): MatEntry[] {
  const result: MatEntry[] = [];
  const re = /([а-яёА-ЯЁ-]+(?:\s+[а-яёА-ЯЁ-]+)?)\s+(\d+(?:[.,]\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const nameRaw = m[1].trim();
    const lower = nameRaw.toLowerCase();
    // Skip "состав" header
    if (/^состав/.test(lower)) continue;
    const pct = Number(m[2].replace(",", "."));
    let cat: Category | null = null;
    for (const c of Object.keys(CATEGORY_KEYWORDS) as Category[]) {
      if (CATEGORY_KEYWORDS[c].test(nameRaw)) {
        cat = c;
        break;
      }
    }
    if (cat) result.push({ name: lower, pct, cat });
  }
  return result;
}

function totalByCat(entries: MatEntry[]): Record<Category, number> {
  const totals: Record<Category, number> = {
    synthetic: 0, artificial: 0, wool: 0, cotton: 0, linen: 0, silk: 0,
  };
  for (const e of entries) totals[e.cat] += e.pct;
  return totals;
}

// Format input composition for parens "(80% полиэстер, 15% вискоза, 5% эластан)"
function compositionInParens(entries: MatEntry[]): string {
  if (entries.length === 0) return "";
  const sorted = [...entries].sort((a, b) => b.pct - a.pct);
  return "(" + sorted.map((e) => {
    const pctStr = Number.isInteger(e.pct) ? String(e.pct) : String(e.pct);
    return `${pctStr}% ${e.name}`;
  }).join(", ") + ")";
}

// ============================================================
// Carrier and connectors
// ============================================================

function carrierGen(prod: ProductionType): string {
  return prod === "knit" ? "пряжи" : "ткани";
}

function carrierGenitiveAdjective(prod: ProductionType): string {
  // "пряжей" (instrumental) — actually for "в смеси с шерстяной пряжей" we use instrumental ?
  // For "из шерстяной ткани"/"из шерстяной пряжи" we use genitive feminine.
  // Не используется — ткани/пряжи в genitive feminine.
  return prod === "knit" ? "пряжи" : "ткани";
}

function carrierInstrumental(prod: ProductionType): string {
  return prod === "knit" ? "пряжей" : "тканью";
}

function connectorVSmesi(prod: ProductionType): string {
  // "в смеси" (трикотаж) / "в сочетании" (швейные)
  return prod === "knit" ? "в смеси" : "в сочетании";
}

function connectorIzSmesi(prod: ProductionType): string {
  // "из смеси" (трикотаж) / "из сочетания" (швейные)
  return prod === "knit" ? "из смеси" : "из сочетания";
}

// ============================================================
// Fabric phrase builder (one phrase per unique composition)
// ============================================================

function joinAnd(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " и " + parts[parts.length - 1];
}

function categoryPhraseGen(cat: Category): string {
  if (cat === "silk") return "нитей натурального шёлка";
  return `${ADJ_GEN[cat]} ${TAIL_GEN[cat]}`;
}

function categoryPhraseInst(cat: Category): string {
  if (cat === "silk") return "нитями натурального шёлка";
  return `${ADJ_INST[cat]} ${TAIL_INST[cat]}`;
}

/** Format the "admixture" tail used after "с вложением" (genitive) or "в смеси с" (instrumental). */
function admixtureTail(cats: Category[], casus: "gen" | "inst"): string {
  if (cats.length === 0) return "";
  const phrases = cats.map((c) => casus === "gen" ? categoryPhraseGen(c) : categoryPhraseInst(c));
  return joinAnd(phrases);
}

/** Multi-category list collapsed with shared "волокон и нитей" tail (3+ categories per памятка). */
function collapsedMultiCatPhrase(cats: Category[]): string {
  const adjs = cats.map((c) => ADJ_GEN[c]);
  const hasNiti = cats.some(isNitiCat);
  const hasVolokna = cats.some((c) => !isNitiCat(c));
  let tail = "";
  if (hasNiti && hasVolokna) tail = "волокон и нитей";
  else if (hasNiti) tail = "нитей";
  else tail = "волокон";
  return `${joinAnd(adjs)} ${tail}`;
}

/**
 * Build the main fabric phrase for one composition.
 * Returns: "из {carrier_phrase} (NN% mat, …)"
 */
export function fabricPhrase(composition: string, prod: ProductionType): string {
  const entries = parseCompositionEntries(composition);
  const carrier = carrierGen(prod);
  const totals = totalByCat(entries);

  // Parens with composition are NOT appended — user explicitly requested no "(X% material, …)".
  // Composition stays in the "Товары" section of the form, not in the description text.
  const withParens = (phrase: string) => phrase;

  // Empty composition
  if (entries.length === 0) {
    return withParens(`из ${carrier} из различных волокон`);
  }

  // === Priority 1: Лён присутствует ===
  if (totals.linen > 0) {
    if (totals.linen === 100) {
      return withParens(`из чистольняной ${carrier}`);
    }
    return withParens(`из полульняной ${carrier}`);
  }

  // === Priority 2: Шерсть ===
  if (totals.wool === 100) {
    return withParens(`из чистошерстяной ${carrier}`);
  }
  if (totals.wool >= 70) {
    const others = (Object.keys(totals) as Category[])
      .filter((c) => c !== "wool" && totals[c] > 0)
      .sort((a, b) => totals[b] - totals[a]);
    // Rule (observed from user's dictionary):
    //   wool ≥70% + exactly 1 non-wool category → mention admixture
    //   wool ≥70% + 2+ non-wool categories → "шерстяная" alone (don't enumerate)
    if (others.length === 0 || others.length >= 2) {
      return withParens(`из шерстяной ${carrier}`);
    }
    const allLE10 = others.every((c) => totals[c] <= 10);
    if (allLE10) {
      return withParens(`из шерстяной ${carrier} с вложением ${admixtureTail(others, "gen")}`);
    }
    return withParens(`из шерстяной ${carrier} ${connectorVSmesi(prod)} с ${admixtureTail(others, "inst")}`);
  }
  if (totals.wool >= 30) {
    return withParens(`из полушерстяной ${carrier}`);
  }

  // === Priority 3: Хлопок (нужна СТРОГАЯ доминанта — >50%) ===
  // При ровно 50/50 хлопок не считается доминантным; падаем в "сочетание".
  if (totals.cotton === 100) {
    return withParens(`из хлопчатобумажной ${carrier}`);
  }
  if (totals.cotton > 50) {
    const others = (Object.keys(totals) as Category[])
      .filter((c) => c !== "cotton" && totals[c] > 0)
      .sort((a, b) => totals[b] - totals[a]);
    if (others.length === 0) {
      return withParens(`из хлопчатобумажной ${carrier}`);
    }
    const allLE10 = others.every((c) => totals[c] <= 10);
    if (allLE10) {
      return withParens(`из хлопчатобумажной ${carrier} с вложением ${admixtureTail(others, "gen")}`);
    }
    return withParens(`из хлопчатобумажной ${carrier} ${connectorVSmesi(prod)} с ${admixtureTail(others, "inst")}`);
  }

  // === Priority 4: Шёлк основа (СТРОГАЯ доминанта — >50%) ===
  if (totals.silk > 50) {
    if (totals.silk === 100) {
      return withParens(`из ${carrier} из нитей натурального шёлка`);
    }
    const others = (Object.keys(totals) as Category[])
      .filter((c) => c !== "silk" && totals[c] > 0)
      .sort((a, b) => totals[b] - totals[a]);
    const allLE10 = others.every((c) => totals[c] <= 10);
    if (allLE10) {
      return withParens(`из ${carrier} из нитей натурального шёлка с вложением ${admixtureTail(others, "gen")}`);
    }
    return withParens(`из ${carrier} из нитей натурального шёлка ${connectorVSmesi(prod)} с ${admixtureTail(others, "inst")}`);
  }

  // === Synthetic/Artificial dominant (no significant naturals) ===
  const presentCats = (Object.keys(totals) as Category[])
    .filter((c) => totals[c] > 0)
    .sort((a, b) => totals[b] - totals[a]);

  if (presentCats.length === 0) {
    return withParens(`из ${carrier} из различных волокон`);
  }

  if (presentCats.length === 1) {
    return withParens(`из ${carrier} из ${categoryPhraseGen(presentCats[0])}`);
  }

  const izConn = connectorIzSmesi(prod);

  // Single composition multi-category — own suffix for 2 cats, collapsed for 3+
  if (presentCats.length === 2) {
    const phrases = presentCats.map((c) => categoryPhraseGen(c));
    return withParens(`из ${carrier} ${izConn} ${joinAnd(phrases)}`);
  }

  // 3+ categories — collapsed tail
  return withParens(`из ${carrier} ${izConn} ${collapsedMultiCatPhrase(presentCats)}`);
}

// ============================================================
// Layer detection
// ============================================================

const OUTERWEAR_PATTERNS = [/пальто/i, /куртк/i, /плащ/i, /шуб/i, /дублёнк/i, /дубленк/i, /пуховик/i, /парк/i];
const UNDERWEAR_PATTERNS = [
  /трус/i, /бюстгальтер/i, /комбин/i, /бельё/i, /белье/i, /пижам/i,
  /пеньюар/i, /купальник/i, /кальсон/i, /панталон/i,
  // Multi-word: stems separated by inflection + space (сорочки ночные, халаты ночные)
  /сорочк[а-я]*\s+ноч/i, /халат[а-я]*\s+ноч/i,
  /ночн[а-я]*\s+сорочк/i,
  // ГОСТ-канон: фуфайка/футболка/майка/топ/лонгслив — это бельевые изделия 1-го слоя
  /фуфайк/i, /футболк/i, /майк/i, /топ\b/i, /лонгслив/i,
  /боди/i,
];

function detectItemLayer(name: string, liningOver40?: boolean): Layer {
  if (liningOver40) return "3";
  // Use the ГОСТ-canonical BASE name for matching, so model variants
  // (Боксеры → трусы → 1st layer; Худи → толстовки → 2nd layer) classify correctly.
  const mapping = classifyItem(name);
  const checkName = mapping?.base ?? name;
  if (UNDERWEAR_PATTERNS.some((p) => p.test(checkName))) return "1";
  if (OUTERWEAR_PATTERNS.some((p) => p.test(checkName))) return "3";
  return "2";
}

function aggregateLayer(items: ProductRow[]): Layer {
  const layers = new Set(items.map((i) => detectItemLayer(i.product_name ?? "", i.lining_over_40)));
  // If any 3rd-layer item present, prefer 3rd (outerwear dominates)
  if (layers.has("3") && !layers.has("1")) return "3";
  if (layers.has("1") && layers.size === 1) return "1";
  if (layers.has("2") || (layers.has("3") && layers.has("1"))) return "2";
  return "2";
}

function layerPhrase(layer: Layer): string {
  switch (layer) {
    case "1": return "бельевые первого слоя";
    case "2": return "верхние второго слоя";
    case "3": return "верхние третьего слоя";
  }
}

// ============================================================
// Production type aggregation
// ============================================================

function aggregateProduction(items: ProductRow[]): ProductionType {
  const knit = items.filter((i) => i.production_type === "knit").length;
  const woven = items.length - knit;
  return knit > woven ? "knit" : "woven";
}

function productionWord(prod: ProductionType): string {
  return prod === "knit" ? "трикотажные" : "швейные";
}

// ============================================================
// Gender aggregation
// ============================================================

const NAME_GENDER_PATTERNS: Record<Exclude<ItemGender, "auto">, RegExp[]> = {
  women: [/плать/i, /юбк/i, /блузк/i, /сарафан/i, /женск/i, /бюстгальтер/i],
  men: [/мужск/i, /галстук/i, /смокинг/i, /кальсон/i],
  kids: [/детск/i, /для детей/i, /младенч/i, /школьн/i, /дошкольн/i, /подростков/i, /ясельн/i],
  adults: [],
};

function genderFromName(name: string): Exclude<ItemGender, "auto" | "adults"> | null {
  for (const g of ["women", "men", "kids"] as const) {
    if (NAME_GENDER_PATTERNS[g].some((p) => p.test(name))) return g;
  }
  return null;
}

function aggregateGenderPhrase(items: ProductRow[]): string {
  const detected = new Set<Exclude<ItemGender, "auto">>();
  for (const item of items) {
    const hint = item.gender_hint ?? "auto";
    if (hint === "auto") {
      const fromName = genderFromName(item.product_name ?? "");
      if (fromName) detected.add(fromName);
    } else {
      detected.add(hint);
    }
  }
  // Default to "для взрослых" when nothing was specified or detectable —
  // declaration must include gender, and adults is the safe default.
  if (detected.size === 0) return "для взрослых";
  if (detected.size === 1) {
    const only = [...detected][0];
    switch (only) {
      case "women": return "для женщин";
      case "men": return "для мужчин";
      case "kids": return "для детей старше трёх лет (ясельной, дошкольной, школьной возрастных групп) и подростков";
      case "adults": return "для взрослых";
    }
  }
  if (detected.has("kids")) {
    return "для взрослых и детей";
  }
  return "для взрослых";
}

// ============================================================
// Item name canonicalization (ГОСТ 17037-2022)
// ============================================================

/**
 * Map common/colloquial product names to ГОСТ 17037-2022 base + optional model.
 *
 * If the user enters a НАМЕНОВАНИЕ that ГОСТ 17037 treats as a "вариант
 * исполнения" (a model/variant of a base type), we keep the base name and
 * record the variant as a model — output becomes "{base}, в том числе модель «{model}»".
 *
 * Examples per памятка / ГОСТ 17037:
 *   - сарафан     → платья + model «сарафан»
 *   - лонгслив    → фуфайки с длинным рукавом + model «лонгслив»
 *   - худи        → толстовки + model «худи»
 *   - бриджи      → брюки + model «бриджи»
 *   - боксеры     → трусы + model «боксеры»
 */
type ItemMapping = { base: string; model?: string };

const ITEM_DICTIONARY: Array<{ pattern: RegExp; mapping: ItemMapping }> = [
  // Бельевые
  { pattern: /^лонгслив/i, mapping: { base: "фуфайки с длинным рукавом", model: "лонгслив" } },
  { pattern: /^футболк/i, mapping: { base: "фуфайки (футболки)" } },
  { pattern: /^фуфайк/i, mapping: { base: "фуфайки" } },
  { pattern: /^топ\b/i, mapping: { base: "майки", model: "топ" } },
  { pattern: /^майк/i, mapping: { base: "майки" } },
  { pattern: /^боксер/i, mapping: { base: "трусы", model: "боксеры" } },
  { pattern: /^слип/i, mapping: { base: "трусы", model: "слипы" } },
  { pattern: /^стринг/i, mapping: { base: "трусы", model: "стринги" } },
  { pattern: /^бразилиан/i, mapping: { base: "трусы", model: "бразилианы" } },
  { pattern: /^танго/i, mapping: { base: "трусы", model: "танго" } },
  { pattern: /^макси/i, mapping: { base: "трусы", model: "макси" } },
  { pattern: /^трус/i, mapping: { base: "трусы" } },
  { pattern: /^пижам/i, mapping: { base: "пижамы" } },
  { pattern: /^кальсон/i, mapping: { base: "кальсоны" } },
  { pattern: /^панталон/i, mapping: { base: "панталоны" } },
  { pattern: /^комбинац/i, mapping: { base: "комбинации" } },
  { pattern: /^комбидресс/i, mapping: { base: "боди", model: "комбидресс" } },
  { pattern: /^боди/i, mapping: { base: "боди" } },
  { pattern: /^пеньюар/i, mapping: { base: "халаты ночные", model: "пеньюар" } },
  { pattern: /^халат[а-я]*\s+ноч/i, mapping: { base: "халаты ночные" } },
  { pattern: /^(сорочк[а-я]*\s+ноч|ночн[а-я]*\s+сорочк)/i, mapping: { base: "сорочки ночные" } },
  // Корсетные
  { pattern: /^бюстгальтер/i, mapping: { base: "бюстгальтеры" } },
  // Верхние 2-го слоя — платья и его варианты
  { pattern: /^сарафан/i, mapping: { base: "платья", model: "сарафан" } },
  { pattern: /^тунич?к/i, mapping: { base: "платья", model: "туника" } },
  { pattern: /^плать/i, mapping: { base: "платья" } },
  { pattern: /^блузк/i, mapping: { base: "блузки" } },
  { pattern: /^юбк/i, mapping: { base: "юбки" } },
  // Брюки и варианты
  { pattern: /^бриджи/i, mapping: { base: "брюки", model: "бриджи" } },
  { pattern: /^бермуд/i, mapping: { base: "брюки", model: "бермуды" } },
  { pattern: /^капри/i, mapping: { base: "брюки", model: "капри" } },
  { pattern: /^джинс/i, mapping: { base: "брюки", model: "джинсы" } },
  { pattern: /^карго/i, mapping: { base: "брюки", model: "карго" } },
  { pattern: /^брюк/i, mapping: { base: "брюки" } },
  { pattern: /^шорт/i, mapping: { base: "шорты" } },
  { pattern: /^комбинез|^полукомбинез/i, mapping: { base: "комбинезоны" } },
  { pattern: /^рубашк|^сорочк\s+верх/i, mapping: { base: "сорочки верхние (рубашки)" } },
  { pattern: /^костюм/i, mapping: { base: "костюмы" } },
  { pattern: /^пиджак/i, mapping: { base: "пиджаки" } },
  { pattern: /^жакет/i, mapping: { base: "жакеты" } },
  { pattern: /^жилет/i, mapping: { base: "жилеты" } },
  // Джемперы / свитеры / толстовки
  { pattern: /^свитшот/i, mapping: { base: "джемперы", model: "свитшот" } },
  { pattern: /^джемпер/i, mapping: { base: "джемперы" } },
  { pattern: /^водолазк/i, mapping: { base: "свитеры", model: "водолазка" } },
  { pattern: /^свитер/i, mapping: { base: "свитеры" } },
  { pattern: /^пуловер/i, mapping: { base: "пуловеры" } },
  { pattern: /^кардиган/i, mapping: { base: "кардиганы" } },
  { pattern: /^худи/i, mapping: { base: "толстовки", model: "худи" } },
  { pattern: /^толстовк/i, mapping: { base: "толстовки" } },
  { pattern: /^халат\b/i, mapping: { base: "халаты домашние" } },
  // Верхняя одежда (3-й слой)
  { pattern: /^пальто/i, mapping: { base: "пальто" } },
  { pattern: /^плащ/i, mapping: { base: "плащи" } },
  { pattern: /^куртк/i, mapping: { base: "куртки" } },
  { pattern: /^шуб/i, mapping: { base: "шубы" } },
  { pattern: /^дублёнк|^дубленк/i, mapping: { base: "дублёнки" } },
  { pattern: /^пуховик/i, mapping: { base: "пуховики" } },
  { pattern: /^парк/i, mapping: { base: "парки" } },
];

function classifyItem(name: string): ItemMapping | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  for (const entry of ITEM_DICTIONARY) {
    if (entry.pattern.test(trimmed)) return entry.mapping;
  }
  // Unknown: pass through lowercased name as base
  return { base: trimmed.toLowerCase() };
}

function formatAssortment(items: ProductRow[]): string {
  // Group by base name, collecting unique models per base.
  // Preserves insertion order of bases.
  const modelsByBase = new Map<string, Set<string>>();
  const baseOrder: string[] = [];

  for (const item of items) {
    const m = classifyItem(item.product_name ?? "");
    if (!m) continue;
    if (!modelsByBase.has(m.base)) {
      modelsByBase.set(m.base, new Set());
      baseOrder.push(m.base);
    }
    if (m.model) modelsByBase.get(m.base)!.add(m.model);
  }

  return baseOrder
    .map((base) => {
      const models = [...modelsByBase.get(base)!];
      if (models.length === 0) return base;
      if (models.length === 1) return `${base}, в том числе модель «${models[0]}»`;
      return `${base}, в том числе моделей: «${models.join("», «")}»`;
    })
    .join(", ");
}

// ============================================================
// ГОСТ references (depends on detected items + layer)
// ============================================================

const GOST_PLATEVAYA = 'ГОСТ 25294-2003 "Одежда верхняя платьево-блузочного ассортимента. Общие технические условия"';
const GOST_PALTOVAYA = 'ГОСТ 25295-2003 "Одежда верхняя пальтово-костюмного ассортимента. Общие технические условия"';

// ГОСТ 25295-2003 covers both "верхняя пальтовая" (пальто/куртки/плащи) AND
// "костюмная" (костюмы/пиджаки/жакеты/жилеты). Separate from OUTERWEAR_PATTERNS
// because suit items are 2nd-layer (not 3rd-layer outerwear) but still
// classified under пальтово-костюмный ассортимент for ГОСТ purposes.
const SUIT_PATTERNS = [/костюм/i, /пиджак/i, /жакет/i, /жилет/i];

function isPaltovayaItem(name: string): boolean {
  return OUTERWEAR_PATTERNS.some((p) => p.test(name)) || SUIT_PATTERNS.some((p) => p.test(name));
}

function gostReferencesBlock(items: ProductRow[]): string {
  const gosts = new Set<string>();
  for (const item of items) {
    const name = item.product_name ?? "";
    // Use ГОСТ-canonical base name so model variants classify correctly
    // (Бразилианы → трусы → бельё → skip GOST; Худи → толстовки → не бельё)
    const mapping = classifyItem(name);
    const checkName = mapping?.base ?? name;
    if (UNDERWEAR_PATTERNS.some((p) => p.test(checkName))) continue; // бельё — отдельные ГОСТы (пока не подключены)
    if (isPaltovayaItem(checkName)) gosts.add(GOST_PALTOVAYA);
    else gosts.add(GOST_PLATEVAYA);
  }
  if (gosts.size === 0) return "";
  return [...gosts].join(". ") + ".";
}

// ============================================================
// Main composer
// ============================================================

export function composeDeclaration(args: ComposeArgs): ComposedDeclaration {
  const items = (args.products ?? []).filter(
    (p) => (p.tn_ved_code && p.tn_ved_code.trim()) || (p.product_name && p.product_name.trim()),
  );
  if (items.length === 0) {
    return {
      product_group_description: "",
      product_group_intro: "",
      gost_references_block: "",
      has_appendix: "",
      kod_tn_ved_line: "",
    };
  }

  const layer = aggregateLayer(items);
  const production = aggregateProduction(items);
  const productionPhrase = productionWord(production);

  // Per-item fabric phrases, deduplicated
  const seen = new Set<string>();
  const fabricPhrases: string[] = [];
  for (const item of items) {
    const phrase = fabricPhrase(item.product_composition ?? "", production);
    if (!seen.has(phrase)) {
      seen.add(phrase);
      fabricPhrases.push(phrase);
    }
  }

  const genderPhrase = aggregateGenderPhrase(items);
  const assortment = formatAssortment(items);
  const brand = (args.brand_name ?? "").trim();

  // Build description
  // "Изделия {layer} {production} {fabric1}[, {fabric2}…] {gender_phrase}, в комплектах и отдельными предметами: {assortment}, с маркировкой «{brand}»"
  const parts: string[] = [];
  parts.push(`Изделия ${layerPhrase(layer)} ${productionPhrase}`);
  if (fabricPhrases.length > 0) {
    parts.push(fabricPhrases.join(", "));
  }
  if (genderPhrase) {
    parts.push(genderPhrase);
  }

  // Assortment block — different phrasing for 1 vs many
  // Unified structure for both single and multi: "{base}: {assortment}, с маркировкой «{brand}»"
  let description = parts.join(" ");
  if (assortment) description += `: ${assortment}`;
  if (brand) description += `, с маркировкой «${brand}»`;
  const isMulti = items.length > 1;

  // Intro for appendix subheader (same minus assortment+brand)
  const introParts = [`Изделия ${layerPhrase(layer)} ${productionPhrase}`];
  if (fabricPhrases.length > 0) introParts.push(fabricPhrases.join(", "));
  if (genderPhrase) introParts.push(genderPhrase);
  if (brand) introParts.push(`с маркировкой «${brand}»`);
  const intro = introParts.join(", ");

  const kod_tn_ved_line = isMulti
    ? "согласно приложению"
    : (items[0].tn_ved_code ?? "").trim() || "—";

  return {
    product_group_description: description,
    product_group_intro: intro,
    gost_references_block: gostReferencesBlock(items),
    has_appendix: isMulti ? "1" : "",
    kod_tn_ved_line,
  };
}

export function composeProductGroupDescription(args: ComposeArgs): string {
  return composeDeclaration(args).product_group_description;
}

// ============================================================
// ТН ВЭД auto-derivation (per-item) — same logic as before
// ============================================================

type Subgroup =
  | "platja" | "skirt"
  | "pants" | "shorts" | "overall"
  | "blouse" | "shirt" | "suit" | "jacket"
  | "outerwear" | "anorak" | "tshirt" | "sweater" | "kids" | "tracksuit" | "ski"
  | "swim_men" | "swim_women"
  // Бельё в ТН ВЭД делится по виду изделия, а не только по материалу.
  // "underwear" — прочее бельё (майки швейные, боди, халаты ночные и т.п.)
  | "briefs" | "nightwear" | "slip" | "underwear" | "bra";

function classifyProduct(
  name: string,
  isKnit: boolean,
  gender: ItemGender = "auto",
): { code4: string; subgroup: Subgroup } | null {
  if (!name) return null;
  // Use ГОСТ-canonical base name from dictionary, so model variants
  // (Бразилианы → трусы, Худи → толстовки, и т.п.) попадают в правильную подгруппу.
  const mapping = classifyItem(name);
  const matchName = mapping?.base ?? name;
  const prefix = isKnit ? "61" : "62";

  const isMenItem = gender === "men" || /мужск/i.test(name) || /мужск/i.test(matchName);
  const isKidsItem = gender === "kids" || /(детск|для детей|младенч|ясельн)/i.test(name);

  if (isKidsItem) {
    return { code4: isKnit ? "6111" : "6209", subgroup: "kids" };
  }

  if (OUTERWEAR_PATTERNS.some((p) => p.test(matchName))) {
    // Куртки в ТН ВЭД идут отдельно от пальто/плащей (см. EAEU_LAST_4_OVERRIDES)
    const subgroup = /(куртк|пуховик|парк)/i.test(matchName) ? "anorak" : "outerwear";
    return { code4: prefix + (isMenItem ? "01" : "02"), subgroup };
  }

  if (/купальн/i.test(matchName)) {
    return { code4: isKnit ? "6112" : "6211", subgroup: isMenItem ? "swim_men" : "swim_women" };
  }
  if (/костюм/i.test(matchName) && /лыжн/i.test(name)) {
    return { code4: isKnit ? "6112" : "6211", subgroup: "ski" };
  }
  if (/костюм/i.test(matchName) && /спортивн/i.test(name)) {
    return { code4: isKnit ? "6112" : "6211", subgroup: "tracksuit" };
  }

  if (isKnit && /футболк|фуфайк|майк/i.test(matchName)) return { code4: "6109", subgroup: "tshirt" };
  if (isKnit && /(свитер|пуловер|кардиган|джемпер|водолазк|свитшот|толстовк)/i.test(matchName)) {
    return { code4: "6110", subgroup: "sweater" };
  }

  if (/(плать|сарафан)/i.test(matchName)) return { code4: prefix + "04", subgroup: "platja" };
  if (/юбк/i.test(matchName)) return { code4: prefix + "04", subgroup: "skirt" };
  if (/блузк/i.test(matchName)) return { code4: prefix + "06", subgroup: "blouse" };

  if (/костюм/i.test(matchName)) {
    return { code4: prefix + (isMenItem ? "03" : "04"), subgroup: "suit" };
  }
  if (/(пиджак|жакет|жилет)/i.test(matchName)) {
    return { code4: prefix + (isMenItem ? "03" : "04"), subgroup: "jacket" };
  }

  if (/(брюк|штан)/i.test(matchName)) {
    return { code4: prefix + (isMenItem ? "03" : "04"), subgroup: "pants" };
  }
  if (/шорт/i.test(matchName)) {
    return { code4: prefix + (isMenItem ? "03" : "04"), subgroup: "shorts" };
  }
  if (/(комбинез|полукомбинез)/i.test(matchName)) {
    return { code4: prefix + (isMenItem ? "03" : "04"), subgroup: "overall" };
  }

  if (/рубашк/i.test(matchName) || /сорочк[а-я]*\s+верх/i.test(matchName)) {
    if (/женск/i.test(name)) return { code4: prefix + "06", subgroup: "blouse" };
    return { code4: prefix + (isMenItem ? "05" : "06"), subgroup: isMenItem ? "shirt" : "blouse" };
  }

  if (/бюстгальтер/i.test(matchName)) return { code4: "6212", subgroup: "bra" };

  if (UNDERWEAR_PATTERNS.some((p) => p.test(matchName))) {
    const code4 = prefix + (isMenItem ? "07" : "08");
    if (/(трус|кальсон|панталон)/i.test(matchName)) return { code4, subgroup: "briefs" };
    if (/(пижам|сорочк)/i.test(matchName)) return { code4, subgroup: "nightwear" };
    if (/комбинац/i.test(matchName) && !isMenItem) return { code4, subgroup: "slip" };
    return { code4, subgroup: "underwear" };
  }

  return null;
}

function materialDigits(composition: string, subgroup: Subgroup, code4: string, isMen: boolean): string {
  const entries = parseCompositionEntries(composition);
  const totals = totalByCat(entries);

  // ТН ВЭД rule: "predominates by weight" — фибра должна быть СТРОГО >50%.
  // Если ни одна категория не превышает 50%, используем "other" суффикс.
  // Note: для некоторых subgroup'ов синт+искусств объединяются в один код (.33, .13 и т.п.).
  const dom = (c: Category) => totals[c] > 50;
  const synthArtifTotal = totals.synthetic + totals.artificial;

  switch (subgroup) {
    case "platja":
      // 6104/6204.41 шерсть, .42 хлопок, .43 синт, .44 искусств, .49 прочие
      if (dom("wool")) return "41";
      if (dom("cotton")) return "42";
      if (dom("synthetic")) return "43";
      if (dom("artificial")) return "44";
      return "49";
    case "skirt":
      // 6104/6204.51 шерсть, .52 хлопок, .53 синт, .59 прочие (включая искусств)
      if (dom("wool")) return "51";
      if (dom("cotton")) return "52";
      if (dom("synthetic")) return "53";
      return "59";
    case "pants":
    case "shorts":
    case "overall":
      // 6103 (муж knit) / 6203 (муж woven): .41 шерсть, .42 хлопок, .43 синт, .49 прочие (включая искусств)
      // 6104 (жен knit) / 6204 (жен woven): .61 шерсть, .62 хлопок, .63 синт, .69 прочие (включая искусств)
      if (code4 === "6103" || code4 === "6203") {
        if (dom("wool")) return "41";
        if (dom("cotton")) return "42";
        if (dom("synthetic")) return "43";
        return "49";
      }
      // 6104 / 6204 (женские)
      if (dom("wool")) return "61";
      if (dom("cotton")) return "62";
      if (dom("synthetic")) return "63";
      return "69";
    case "blouse":
      // 6106 (knit): .10 хлопок, .20 синт/искусств, .90 прочие (шерсть/шёлк/лён — в last4)
      if (code4 === "6106") {
        if (dom("cotton")) return "10";
        if (synthArtifTotal > 50) return "20";
        return "90";
      }
      // 6206 (woven): .10 шёлк, .20 шерсть, .30 хлопок, .40 синт/искусств, .90 прочие
      if (dom("silk")) return "10";
      if (dom("wool")) return "20";
      if (dom("cotton")) return "30";
      if (synthArtifTotal > 50) return "40";
      return "90";
    case "shirt":
      // 6105 (knit): .10 хлопок, .20 синт/искусств, .90 прочие
      if (code4 === "6105") {
        if (dom("cotton")) return "10";
        if (synthArtifTotal > 50) return "20";
        return "90";
      }
      // 6205 (woven): .20 хлопок, .30 синт/искусств, .90 прочие (шерсть и лён — в last4, .10 нет)
      if (dom("cotton")) return "20";
      if (synthArtifTotal > 50) return "30";
      return "90";
    case "outerwear":
    case "anorak":
      // 6201/6202 (woven): 20 шерсть, 30 хлопок, 40 синт/искусств, 90 прочие
      // 6101 (knit men): 20 хлопок, 30 синт/искусств, 90 прочие (нет .10!)
      // 6102 (knit women): 10 шерсть, 20 хлопок, 30 синт/искусств, 90 прочие
      if (code4 === "6101") {
        // муж трикотаж — нет варианта для шерсти, всё в .90
        if (dom("cotton")) return "20";
        if (synthArtifTotal > 50) return "30";
        return "90";
      }
      if (code4 === "6102") {
        // жен трикотаж
        if (dom("wool")) return "10";
        if (dom("cotton")) return "20";
        if (synthArtifTotal > 50) return "30";
        return "90";
      }
      // 6201 / 6202 (woven)
      if (dom("wool")) return "20";
      if (dom("cotton")) return "30";
      if (synthArtifTotal > 50) return "40";
      return "90";
    case "suit":
      // 6203/6204 (woven): 11 шерсть, 12 хлопок, 13 синт/искусств, 19 прочие
      // 6103 (knit men):  только 6103.10 — split в last4 по материалу (1000 шерсть / 9000 прочие).
      // 6104 (knit women): .13 синт, .19 прочие (split в last4: 1900=шерсть, 1100=хлопок etc).
      if (code4 === "6103") {
        return "10"; // всё в 6103.10, материал решает last4
      }
      if (code4 === "6104") {
        if (dom("synthetic")) return "13";
        return "19"; // wool/cotton/artificial/other — всё в .19 split в last4
      }
      // 6203 (муж woven): .11 шерсть, .12 синт, .19 прочие (хлопок/искусств — в last4)
      if (code4 === "6203") {
        if (dom("wool")) return "11";
        if (dom("synthetic")) return "12";
        return "19";
      }
      // 6204 (жен woven): .11 шерсть, .12 хлопок, .13 синт, .19 прочие (искусств — в last4)
      if (dom("wool")) return "11";
      if (dom("cotton")) return "12";
      if (dom("synthetic")) return "13";
      return "19";
    case "jacket":
      // 6103/6104/6203/6204.31 шерсть, .32 хлопок, .33 синт, .39 прочие (включая искусств)
      if (dom("wool")) return "31";
      if (dom("cotton")) return "32";
      if (dom("synthetic")) return "33";
      return "39";
    case "tshirt":
      // 6109.10 хлопок, .90 прочие (split: .90 200=шерсть, .90 900=прочие)
      if (dom("cotton")) return "10";
      return "90";
    case "sweater":
      // 6110.11 шерсть, .12 тонкое волокно, .19 шерсть прочая, .20 хлопок, .30 синт, .90 прочие
      if (dom("wool")) return "11";
      if (dom("cotton")) return "20";
      if (synthArtifTotal > 50) return "30";
      return "90";
    case "briefs":
      // 6107 кальсоны/трусы: .11 хлопок, .12 синт/искусств, .19 прочие
      // 6108 трусы/панталоны: .21 хлопок, .22 синт/искусств, .29 прочие
      // 6207 трусы/кальсоны: .11 хлопок, .19 прочие. 6208 — отдельной позиции нет, «прочие» .9x
      if (code4 === "6107") {
        if (dom("cotton")) return "11";
        if (synthArtifTotal > 50) return "12";
        return "19";
      }
      if (code4 === "6207") return dom("cotton") ? "11" : "19";
      if (code4 === "6108") {
        if (dom("cotton")) return "21";
        if (synthArtifTotal > 50) return "22";
        return "29";
      }
      if (dom("cotton")) return "91";
      if (synthArtifTotal > 50) return "92";
      return "99";
    case "nightwear":
      // 6108 ночные сорочки/пижамы: .31 хлопок, .32 синт/искусств, .39 прочие
      // 6107/6207/6208: .21 хлопок, .22 синт/искусств, .29 прочие
      if (code4 === "6108") {
        if (dom("cotton")) return "31";
        if (synthArtifTotal > 50) return "32";
        return "39";
      }
      if (dom("cotton")) return "21";
      if (synthArtifTotal > 50) return "22";
      return "29";
    case "slip":
      // 6108/6208 комбинации: .11 синт/искусств, .19 прочие
      return synthArtifTotal > 50 ? "11" : "19";
    case "underwear":
      // 6107/6207: .91 хлопок, .99 прочие. 6108/6208: .91 хлопок, .92 синт/искусств, .99 прочие
      if (dom("cotton")) return "91";
      if (code4 === "6107" || code4 === "6207") return "99";
      return synthArtifTotal > 50 ? "92" : "99";
    case "bra":
      return "10";
    case "kids":
      // 6111 (knit): .20 хлопок, .30 синт, .90 прочие
      // 6209 (woven): .20 хлопок, .30 синт, .90 прочие
      if (dom("cotton")) return "20";
      if (synthArtifTotal > 50) return "30";
      return "90";
    case "tracksuit":
      // 6112 (knit): .11 хлопок, .12 синт, .19 прочие
      if (code4 === "6112") {
        if (dom("cotton")) return "11";
        if (dom("synthetic")) return "12";
        return "19";
      }
      // 6211 (woven): муж .32/.33/.39, жен .42/.43/.49 — хлопок/синт-искусств/прочие
      if (dom("cotton")) return isMen ? "32" : "42";
      if (synthArtifTotal > 50) return isMen ? "33" : "43";
      return isMen ? "39" : "49";
    case "ski":
      return "20";
    case "swim_men":
      // 6112 (knit): .31 синт, .39 прочие. 6211 (woven): .11 без деления по материалу
      if (code4 === "6211") return "11";
      return dom("synthetic") ? "31" : "39";
    case "swim_women":
      if (code4 === "6211") return "12";
      return dom("synthetic") ? "41" : "49";
    default:
      if (dom("cotton")) return "20";
      if (synthArtifTotal > 50) return "30";
      return "90";
  }
}

// 6112 купальные костюмы делятся по содержанию эластичных нитей: от 5% — «1000», иначе «9000».
function swimwearLast4(composition: string): string {
  const elastic = parseCompositionEntries(composition)
    .filter((e) => /(эластан|спандекс|лайкр|резин)/i.test(e.name))
    .reduce((sum, e) => sum + e.pct, 0);
  return elastic >= 5 ? "1000" : "9000";
}

// Источник: ЕЭК ТН ВЭД ЕАЭС главы 61, 62 (docs/raw/ett-ch61.pdf, ett-ch62.pdf).
// Ключ: `${code4}.${material2}:${subgroup}` → последние 4 цифры 10-значного кода.
// Где нет записи — используется "0000" (валидно для большинства простых позиций без под-деления).
// Ключ с суффиксом `:${категория}` важнее общего, если волокно этой категории доминирует (>50%).
const EAEU_LAST_4_OVERRIDES: Record<string, string> = {
  // === ВЕРХНЯЯ ОДЕЖДА ТРИКОТАЖ (61 серия) ===
  // 6101 (муж knit) — все подгруппы расщеплены: 0100=пальто/полупальто/накидки/плащи, 0900=куртки/ветровки
  "6101.20:outerwear": "1000",  // хлопок (split 100 пальто / 900 куртки) — default = пальто
  "6101.30:outerwear": "1000",
  "6101.90:outerwear": "2000",  // прочие split 200 пальто / 800 куртки
  // 6102 (жен knit) — все подгруппы 0100/0900 (пальто/куртки)
  "6102.10:outerwear": "1000",
  "6102.20:outerwear": "1000",
  "6102.30:outerwear": "1000",
  "6102.90:outerwear": "1000",
  // Куртки
  "6101.20:anorak": "9000",
  "6101.30:anorak": "9000",
  "6101.90:anorak": "8000",
  "6102.10:anorak": "9000",
  "6102.20:anorak": "9000",
  "6102.30:anorak": "9000",
  "6102.90:anorak": "9000",

  // === ВЕРХНЯЯ ОДЕЖДА ТКАНЬ (62 серия) ===
  // 6201 (муж woven) — все .20/.30/.40/.90 одинаковые 0000 (нет под-деления)
  // 6202 (жен woven) — .20/.30 одинаковые 0000; .40 и .90 split 0001 пальто / 0009 куртки
  "6202.40:outerwear": "0001",
  "6202.90:outerwear": "0001",
  "6202.40:anorak": "0009",
  "6202.90:anorak": "0009",

  // === КОСТЮМЫ ТРИКОТАЖ (61 серия) ===
  // 6103.10 (муж knit) — split в last4 по материалу: 1000=шерсть, 9000=прочие (cotton/synth/etc all collapse to 9000)
  "6103.10:suit": "9000",  // default — прочие материалы
  "6103.10:suit:wool": "1000",
  // 6104.19 (жен knit прочие материалы) split: 2000=хлопок, 9001=шерсть, 9009=прочие
  "6104.19:suit": "9009",  // default
  "6104.19:suit:cotton": "2000",
  "6104.19:suit:wool": "9001",
  // 6104.13 (жен knit синт) — single код, 0000 ок

  // === ПИДЖАКИ / ЖАКЕТЫ ТРИКОТАЖ ===
  // 6103.31/32/33 муж knit — single коды 0000 ок
  // 6103.39 прочие — single 0000
  // 6104.31/32/33/39 жен knit — single 0000 ok

  // === ПИДЖАКИ ТКАНЬ ===
  // 6203.31 шерсть — single 0000
  // 6203.32 хлопок split: 1000 производ / 9000 прочие
  "6203.32:jacket": "9000",
  // 6203.33 синт split: 1000 произв / 9000 прочие
  "6203.33:jacket": "9000",
  // 6203.39 прочие split: 1100 произв / 1900 искусств / 9000 прочие
  "6203.39:jacket": "9000",
  "6203.39:jacket:artificial": "1900",
  // 6204.32 жен split: 1000/9000
  "6204.32:jacket": "9000",
  "6204.33:jacket": "9000",
  "6204.39:jacket": "9000",
  "6204.39:jacket:artificial": "1900",

  // === БРЮКИ / ШОРТЫ / КОМБИНЕЗОНЫ ТРИКОТАЖ ===
  // 6103.41 шерсть — single 0000
  // 6103.42/43/49 муж knit: split 0001 брюки/бриджи, 0009 прочие (шорты/комбинезоны)
  "6103.42:pants": "0001", "6103.42:shorts": "0009", "6103.42:overall": "0009",
  "6103.43:pants": "0001", "6103.43:shorts": "0009", "6103.43:overall": "0009",
  "6103.49:pants": "0001", "6103.49:shorts": "0009", "6103.49:overall": "0009",
  "6103.49:shorts:artificial": "0002", "6103.49:overall:artificial": "0002",
  // 6104.62/63 жен knit — single 0000. 6104.61/69 split как у 6103
  "6104.61:pants": "0001", "6104.61:shorts": "0009", "6104.61:overall": "0009",
  "6104.69:pants": "0001", "6104.69:shorts": "0009", "6104.69:overall": "0009",
  "6104.69:shorts:artificial": "0002", "6104.69:overall:artificial": "0002",

  // === БРЮКИ / ШОРТЫ / КОМБИНЕЗОНЫ ТКАНЬ ===
  // 6203.41 шерсть split: 1000 брюки/бриджи, 3000 комбинезоны, 9000 прочие (шорты)
  "6203.41:pants": "1000", "6203.41:shorts": "9000", "6203.41:overall": "3000",
  // 6203.42 хлопок split: 1100=произв; брюки прочие: 3100 деним / 3300 вельвет / 3500 прочие; комбинезоны: 5100/5900; 9000 прочие шорты
  "6203.42:pants": "3500", "6203.42:shorts": "9000", "6203.42:overall": "5900",
  // 6203.43 синт split: 1100/1900 брюки; 3100/3900 комбинез; 9000 прочие
  "6203.43:pants": "1900", "6203.43:shorts": "9000", "6203.43:overall": "3900",
  // 6203.49 из искусственных нитей: 1100/1900 брюки; 3100/3900 комбин; 5000 шорты. 9000 — все прочие материалы
  "6203.49:pants": "9000", "6203.49:shorts": "9000", "6203.49:overall": "9000",
  "6203.49:pants:artificial": "1900", "6203.49:shorts:artificial": "5000", "6203.49:overall:artificial": "3900",
  // 6204.61 жен шерсть split: 1000 брюки/бриджи, 8500 прочие
  "6204.61:pants": "1000", "6204.61:shorts": "8500", "6204.61:overall": "8500",
  // 6204.62 хлопок split: брюки 3500/3900 в зависимости; общий default = 3900
  "6204.62:pants": "3900", "6204.62:shorts": "9000", "6204.62:overall": "5900",
  // 6204.63 синт split
  "6204.63:pants": "1800", "6204.63:shorts": "9000", "6204.63:overall": "3900",
  // 6204.69 из искусственных нитей: 1100/1800 брюки; 3100/3900 комбин; 5000 шорты. 9000 — все прочие материалы
  "6204.69:pants": "9000", "6204.69:shorts": "9000", "6204.69:overall": "9000",
  "6204.69:pants:artificial": "1800", "6204.69:shorts:artificial": "5000", "6204.69:overall:artificial": "3900",

  // === КОСТЮМЫ ТКАНЬ ===
  // 6203.19 (муж woven прочие) split: 1000 хлопок / 3000 искусств / 9000 прочие
  "6203.19:suit": "9000",
  "6203.19:suit:cotton": "1000",
  "6203.19:suit:artificial": "3000",
  // 6204.19 (жен woven прочие) split: 1000 искусств / 9000 прочие
  "6204.19:suit": "9000",
  "6204.19:suit:artificial": "1000",

  // === ПЛАТЬЯ И ЮБКИ ТКАНЬ ===
  // 6204.49 прочие split: 1000 шёлк / 9000 прочие
  "6204.49:platja": "9000",
  "6204.49:platja:silk": "1000",
  // 6204.59 прочие split: 1000 искусств / 9000 прочие
  "6204.59:skirt": "9000",
  "6204.59:skirt:artificial": "1000",

  // === РУБАШКИ ===
  // 6205.20 хлопок — single 0000
  // 6205.30 синт — single 0000
  // 6205.90 прочие split: 1000 лён, 8001 шерсть, 8009 прочие
  "6205.90:shirt": "8009",
  "6205.90:shirt:wool": "8001",
  "6205.90:shirt:linen": "1000",
  // 6105.20 (knit) split: 1000 синт / 9000 искусств
  "6105.20:shirt": "1000",
  "6105.20:shirt:artificial": "9000",
  // 6105.90 (knit) split: 1000 шерсть / 9000 прочие
  "6105.90:shirt": "9000",
  "6105.90:shirt:wool": "1000",

  // === БЛУЗКИ ТКАНЬ ===
  // 6206.10/20/30/40 — single 0000
  // 6206.90 прочие split: 1000 лён / 9000 прочие
  "6206.90:blouse": "9000",
  "6206.90:blouse:linen": "1000",

  // === БЛУЗКИ ТРИКОТАЖ (6106) ===
  // 6106.10 хлопок, 6106.20 синт/искусств — single 0000
  // 6106.90 прочие split: 1000 шерсть / 3000 шёлк / 5000 лён / 9000 прочие
  "6106.90:blouse": "9000",
  "6106.90:blouse:wool": "1000",
  "6106.90:blouse:silk": "3000",
  "6106.90:blouse:linen": "5000",

  // === БЕЛЬЁ ===
  // 6207.99 прочие split: 1000 синт/искусств / 9000 прочие
  "6207.99:underwear": "9000",
  "6207.99:underwear:synthetic": "1000",
  "6207.99:underwear:artificial": "1000",
  // 6208.19 комбинации прочие split: 0001 хлопок / 0009 прочие
  "6208.19:slip": "0009",
  "6208.19:slip:cotton": "0001",
  // 6212.10 бюстгальтеры split: 1000 в наборах для розничной продажи / 9000 прочие
  "6212.10:bra": "9000",

  // === СПОРТИВНЫЕ КОСТЮМЫ ТКАНЬ (6211) ===
  // .32/.33/.42/.43 split: 3100 с подкладкой / 9000 прочие. Подкладка в форме не указывается — default прочие
  "6211.32:tracksuit": "9000",
  "6211.33:tracksuit": "9000",
  "6211.42:tracksuit": "9000",
  "6211.43:tracksuit": "9000",
  // .49 split: 0001 шерсть / 0009 прочие
  "6211.49:tracksuit": "0009",
  "6211.49:tracksuit:wool": "0001",

  // === ФУТБОЛКИ (6109) ===
  // 6109.10 хлопок — single 0000
  // 6109.90 прочие split: 2000 шерсть / 9000 прочие
  "6109.90:tshirt": "9000",

  // === СВИТЕРЫ (6110) ===
  // 6110.11 шерсть split: 1000=свитеры легкие, 3000=муж прочие, 9000=жен прочие — default = жен
  "6110.11:sweater": "9000",
  // 6110.20 хлопок split: 1000 легкие / 9100 муж прочие / 9900 жен прочие
  "6110.20:sweater": "9900",
  // 6110.30 синт split: 1000 / 9100 / 9900
  "6110.30:sweater": "9900",
  // 6110.90 прочие split: 1000 лён / 9000 прочие
  "6110.90:sweater": "9000",

  // === ДЕТСКАЯ (6111 knit, 6209 woven) ===
  // 6111.20 хлопок split: 1000 перчатки / 9000 прочие
  "6111.20:kids": "9000",
  "6111.30:kids": "9000",
  // 6111.90 прочие split: 1100 шерсть-перчатки / 1900 шерсть-прочие / 9000 прочие
  "6111.90:kids": "9000",
  // 6209: .20 хлопок 0000, .30 синт 0000, .90 прочие split 1000 шерсть / 9000 прочие
  "6209.90:kids": "9000",
};

export function deriveTnVedCode(row: ProductRow): string {
  const name = (row.product_name ?? "").trim();
  if (!name) return "";
  const isKnit = row.production_type === "knit";
  const group = classifyProduct(name, isKnit, row.gender_hint);
  if (!group) return "";
  const isMen = row.gender_hint === "men" || /мужск/i.test(name);
  const material = materialDigits(row.product_composition ?? "", group.subgroup, group.code4, isMen);
  if (group.code4 === "6112" && group.subgroup.startsWith("swim")) {
    return `${group.code4}${material}${swimwearLast4(row.product_composition ?? "")}`;
  }
  const overrideKey = `${group.code4}.${material}:${group.subgroup}`;
  const totals = totalByCat(parseCompositionEntries(row.product_composition ?? ""));
  const dominant = (Object.keys(totals) as Category[]).find((c) => totals[c] > 50);
  const last4 =
    (dominant && EAEU_LAST_4_OVERRIDES[`${overrideKey}:${dominant}`]) ||
    EAEU_LAST_4_OVERRIDES[overrideKey] ||
    "0000";
  return `${group.code4}${material}${last4}`;
}
