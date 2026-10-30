/**
 * LLM-based ТН ВЭД classifier for declaration form.
 *
 * Architecture: Hybrid — rule-based deriveTnVedCode produces a candidate instantly,
 * then this LLM call refines/corrects it using a curated reference of clothing codes.
 *
 * Provider priority (first key found wins):
 *   1. GEMINI_API_KEY → Google Gemini 2.5 Flash (БЕСПЛАТНО до 1500 запросов/день)
 *   2. GROQ_API_KEY   → Groq Llama 3.3 70B (БЕСПЛАТНО до 30 запросов/мин)
 *   3. OPENAI_API_KEY → OpenAI GPT-4o-mini (платно, ~$0.0002/вызов)
 *   4. Fallback на rule-based deriveTnVedCode
 *
 * Falls back gracefully:
 *   - Нет ключей → возвращает null, форма оставляет rule-based код
 *   - API error / timeout → null
 *   - Malformed response → null
 */

import type { ProductRow } from "@/templates/declaration-eaeu-light/compose";

/** Curated ТН ВЭД reference for clothing chapters 61-63 (Глава 61: трикотаж, 62: швейные, 63: прочие). */
const TNVED_REFERENCE = `
ТН ВЭД ЕАЭС — справочник кодов для одежды лёгкой промышленности (главы 61-63):

ГЛАВА 62 — ШВЕЙНЫЕ ИЗДЕЛИЯ (из ткани):
- 6201 — Пальто, плащи, куртки, ветровки МУЖСКИЕ
- 6202 — Пальто, плащи, куртки, ветровки ЖЕНСКИЕ
- 6203 — Костюмы, комплекты, пиджаки, брюки МУЖСКИЕ
  · 6203.11/12/19 — Костюмы (шерсть/синтетика/прочие; хлопок = 6203191000, искусств = 6203193000)
  · 6203.21/22/23/29 — Комплекты
  · 6203.31/32/33/39 — Пиджаки и блейзеры
  · 6203.41/42/43/49 — Брюки, шорты
- 6204 — Костюмы, комплекты, жакеты, платья, юбки, брюки ЖЕНСКИЕ
  · 6204.11/12/13/19 — Костюмы
  · 6204.21/22/23/29 — Комплекты
  · 6204.31/32/33/39 — Жакеты, блейзеры, жилеты
  · 6204.41/42/43/44/49 — Платья и сарафаны (шерсть/хлопок/синт/искусств/прочие)
  · 6204.51/52/53/59 — Юбки и юбки-брюки
  · 6204.61/62/63/69 — Брюки, шорты, комбинезоны
- 6205 — Сорочки верхние (рубашки) МУЖСКИЕ
  · 6205.20/30/90 — хлопок/синтетика-искусств/прочие (шерсть = 6205908001, лён = 6205901000)
- 6206 — Блузки, рубашки ЖЕНСКИЕ
  · 6206.10/20/30/40/90 — шёлк/шерсть/хлопок/синт-искусств/прочие
- 6207 — Бельё МУЖСКОЕ
  · 6207.11/19 — трусы, кальсоны (хлопок/прочие)
  · 6207.21/22/29 — ночные сорочки, пижамы (хлопок/синт-искусств/прочие)
  · 6207.91/99 — прочее: майки, халаты (хлопок/прочие)
- 6208 — Бельё ЖЕНСКОЕ
  · 6208.11/19 — комбинации (синт-искусств/прочие)
  · 6208.21/22/29 — ночные сорочки, пижамы (хлопок/синт-искусств/прочие)
  · 6208.91/92/99 — прочее: майки, трусы, панталоны, пеньюары, халаты (хлопок/синт-искусств/прочие)
- 6209 — Одежда ДЕТСКАЯ швейная (на детей до 86 см и до 134 см)
- 6210 — Одежда из специальных пропитанных/прорезиненных тканей
- 6211 — Костюмы спортивные/лыжные/купальники, прочая одежда
  · 6211.11/12 — купальные муж/жен, 6211.20 — лыжные
  · Спортивные муж: 6211329000 хлопок, 6211339000 синт-искусств, 6211390000 прочие
  · Спортивные жен: 6211429000 хлопок, 6211439000 синт-искусств, 6211490009 прочие (шерсть 6211490001)
- 6212 — Бюстгальтеры, пояса-корсеты, корсеты (КОРСЕТНЫЕ)

ГЛАВА 61 — ТРИКОТАЖНЫЕ ИЗДЕЛИЯ:
- 6101/6102 — Пальто, куртки трикотажные мужские/женские
- 6103/6104 — Костюмы/брюки/платья трикотажные мужские/женские
- 6105 — Рубашки трикотажные мужские
- 6106 — Блузки трикотажные женские
  · 6106.10/20 — хлопок/синт-искусств; прочие: шерсть = 6106901000, шёлк = 6106903000, лён = 6106905000, иное = 6106909000
- 6107 — Бельё трикотажное мужское
  · 6107.11/12/19 — трусы, кальсоны (хлопок/синт-искусств/прочие)
  · 6107.21/22/29 — ночные сорочки, пижамы (хлопок/синт-искусств/прочие)
  · 6107.91/99 — прочее (хлопок/прочие)
- 6108 — Бельё трикотажное женское
  · 6108.11/19 — комбинации (синт-искусств/прочие)
  · 6108.21/22/29 — трусы, панталоны (хлопок/синт-искусств/прочие)
  · 6108.31/32/39 — ночные сорочки, пижамы (хлопок/синт-искусств/прочие)
  · 6108.91/92/99 — прочее: халаты, пеньюары (хлопок/синт-искусств/прочие)
- 6109 — Майки, фуфайки (футболки), нижние сорочки трикотажные
  · 6109.10 — хлопок, 6109.90 — прочие материалы
- 6110 — Свитеры, джемперы, пуловеры, кардиганы, ТОЛСТОВКИ трикотажные
  · 6110.11 — шерсть, 6110.12 — кашемир, 6110.19 — прочая шерсть/тонкое волокно
  · 6110.20 — хлопок, 6110.30 — синтетика/искусств, 6110.90 — прочие
- 6111 — Одежда детская трикотажная (до 86/134 см)
- 6112 — Спортивные/лыжные костюмы и купальники трикотажные
  · 6112.11/12/19 — спортивные (хлопок/синтетика/прочие), 6112.20 — лыжные
  · Купальные муж .31 синт/.39 прочие, жен .41 синт/.49 прочие; последние цифры 1000 при эластане от 5%, иначе 9000
- 6115 — Чулочно-носочные трикотажные
- 6117 — Прочая одежда трикотажная (галстуки, шарфы и т.п.)

ГЛАВА 63 — Прочие готовые текстильные изделия (одеяла, бельё постельное, шторы и т.п.)

МАТЕРИАЛ (5-6 цифры) — общие правила HS Note 2(A) «predominates by weight»:
- Доминирует ШЕРСТЬ строго >50% → суффикс шерстяной (для платьев .41, юбок .51, брюк .61, костюмов/пиджаков .11/.31, пальто/курток .11)
- Доминирует ХЛОПОК строго >50% → суффикс хлопковый (.42/.52/.62/.12/.32/.12/.20/.30)
- Доминирует СИНТЕТИКА/ИСКУССТВЕННЫЕ строго >50% → синтетический суффикс (.43/.53/.63/.13/.33/.13/.30/.40)
- Никто не превышает 50% → суффикс «прочие» (.19/.29/.39/.49/.59/.69/.90)

EAEU СПЕЦИФИКА (7-10 цифры) — обычно 0000, но известные исключения:
- 6104.61 (брюки женские трикотаж шерсть): .000 1 для брюк/бриджей, .000 9 для шорт/комбинезонов
- 6203.39 (пиджаки прочие материалы): .900 0 для бытовых
- При неуверенности используй "0000"

ВАЖНО:
- Сарафаны → платья (6204.4X для швейных, 6104.4X трикотаж)
- Жакеты/жилеты женские → 6204.31-39
- Жакеты/жилеты мужские → 6203.31-39
- Лонгсливы → фуфайки трикотажные → 6109 (если хлопок .10, иначе .90)
- Худи/толстовки → свитеры/пуловеры/кардиганы → 6110 (по материалу)
- Свитшоты → джемперы → 6110
- Бриджи/джинсы/капри → брюки → 6203.4X (муж) / 6204.6X (жен)
- Боксеры/слипы/стринги/бразилианы → трусы → 6107.X (муж) / 6108.X (жен)
- Пеньюары → халаты ночные → 6108.9X (трикотаж) / 6208.9X (швейные)
- Бюстгальтеры → 6212109000 (трикотаж и швейные)
`.trim();

export type ClassificationResult = {
  code: string;
  rationale?: string;
  source: "llm" | "fallback";
};

const SYSTEM_PROMPT = `Ты — эксперт по таможенной классификации ТН ВЭД ЕАЭС, специализирующийся на одежде лёгкой промышленности (ТР ТС 017/2011).
Твоя задача — подобрать ТОЧНЫЙ 10-значный код ТН ВЭД ЕАЭС для одежды на основе наименования, состава, типа производства и пола.
Отвечай СТРОГО в JSON-формате: {"code":"XXXXXXXXXX","rationale":"короткое объяснение выбора"}`;

function buildUserPrompt(row: ProductRow): string {
  const name = (row.product_name ?? "").trim();
  const composition = (row.product_composition ?? "").trim();
  const productionType = row.production_type === "knit" ? "трикотажное (трикотаж)" : "швейное (из ткани)";
  const genderMap: Record<string, string> = {
    auto: "не указано (определи по наименованию)",
    women: "для женщин",
    men: "для мужчин",
    kids: "для детей",
    adults: "для взрослых (унисекс или mix)",
  };
  const gender = genderMap[row.gender_hint ?? "auto"] ?? "не указано";

  return `Подбери 10-значный код ТН ВЭД ЕАЭС для следующего изделия:

Наименование: ${name}
Состав: ${composition || "(не указан)"}
Тип производства: ${productionType}
Для кого: ${gender}

${TNVED_REFERENCE}

Верни только JSON: {"code":"XXXXXXXXXX","rationale":"..."}`;
}

function extractCode(content: string): ClassificationResult | null {
  // Try JSON parse first
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed.code === "string") {
      const code = parsed.code.replace(/\s+/g, "");
      if (/^\d{10}$/.test(code)) {
        return {
          code,
          rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
          source: "llm",
        };
      }
    }
  } catch {
    // Not JSON — try to extract 10-digit code from raw text
    const m = content.match(/\b\d{10}\b/);
    if (m) return { code: m[0], source: "llm" };
  }
  return null;
}

async function callGemini(apiKey: string, userPrompt: string): Promise<ClassificationResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    // gemini-2.5-flash — бесплатный tier (1500 req/day), с thinkingBudget: 0 отключаем
    // extended reasoning чтобы maxOutputTokens хватало на JSON-ответ.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const t = await response.text().catch(() => "");
      console.error("[tnved-llm] Gemini API error:", response.status, t.slice(0, 200));
      return null;
    }
    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;
    return extractCode(content);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[tnved-llm] Gemini error:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  userPrompt: string,
  providerLabel: string,
): Promise<ClassificationResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const t = await response.text().catch(() => "");
      console.error(`[tnved-llm] ${providerLabel} API error:`, response.status, t.slice(0, 200));
      return null;
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    return extractCode(content);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[tnved-llm] ${providerLabel} error:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function classifyTnVedWithLLM(row: ProductRow): Promise<ClassificationResult | null> {
  const name = (row.product_name ?? "").trim();
  if (!name) return null;
  const userPrompt = buildUserPrompt(row);

  // Priority: Gemini (free) → Groq (free) → OpenAI (paid)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const result = await callGemini(geminiKey, userPrompt);
    if (result) return result;
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const result = await callOpenAICompatible(
      "https://api.groq.com/openai/v1/chat/completions",
      groqKey,
      "llama-3.3-70b-versatile",
      userPrompt,
      "Groq",
    );
    if (result) return result;
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const result = await callOpenAICompatible(
      "https://api.openai.com/v1/chat/completions",
      openaiKey,
      "gpt-4o-mini",
      userPrompt,
      "OpenAI",
    );
    if (result) return result;
  }

  return null;
}
