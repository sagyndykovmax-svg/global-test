# Rule: добавление нового типа документа

Каждый шаблон (ТР ТС / тип сертификата) — изолированный модуль. Добавление
нового **не требует правок общего кода** (форма, API, админка, реестр работают
сами по себе).

## 5 шагов

### 1. Создать DOCX-шаблон с плейсхолдерами

Положи исходный `.docx` в `templates/<slug>/template.docx`. Замени динамические
поля на `{placeholders}`:

- Скалярные значения: `{applicant_full_name}`, `{registration_no}` и т.п.
- Циклы по таблицам (один товар на строку): `{#products}` в первой ячейке
  строки, `{/products}` в последней — docxtemplater сам размножит строку
- Условные блоки: `{#flag}...{/flag}` (видны только если `flag` — truthy строка
  или непустой массив)

Если в Word редактировать `.docx` с уже расставленными `{плейсхолдерами}`, Word
может разорвать их на несколько `<w:r>` — docxtemplater такие не находит.
Безопасно — через **unpack → правка XML → pack**. См. `scripts/` в репозитории.

### 2. Создать `compose.ts` (если нужны производные поля)

`src/templates/<slug>/compose.ts` экспортирует чистую функцию:

```ts
export function composeMyTemplate(args: {...}): Record<string, string> {
  // ... правила вычисления полей из входных данных ...
  return {
    derived_field_1: "...",
    derived_field_2: "...",
    has_some_block: condition ? "1" : "",  // truthy строка для conditional блока
  };
}
```

Функция должна:
- Быть чистой (без `Date.now()`, `fetch` и т.п.) — нужна для server- и client-side
- Возвращать `Record<string, string>` (boolean через truthy/falsy строки)
- Покрываться smoke-тестом в `scripts/`

### 3. Создать `schema.ts` с `TemplateDefinition`

`src/templates/<slug>/schema.ts`:

```ts
import { z } from "zod";
import type { TemplateDefinition } from "../types";
import { composeMyTemplate } from "./compose";

export const myTemplateSchema = z.object({
  applicant_full_name: z.string().trim().min(1, "..."),
  // ... все user-input поля
  // ... + опциональные derived поля (default '')
  derived_field_1: z.string().default(""),
});

export const myTemplate: TemplateDefinition = {
  slug: "my-template",
  title: "...",
  description: "...",
  docxPath: "templates/my-template/template.docx",
  schema: myTemplateSchema,
  derivedFields: ["derived_field_1"],  // для UI-пометки «автозаполнение»
  derive: (data) => composeMyTemplate({ ... }),
  sections: [
    { title: "Заявитель", fields: [/* FormFieldDef[] */] },
    // ...
  ],
  adminMetadata: [
    { name: "registration_no", label: "Рег. №", kind: "text" },
    // ...
  ],
};
```

Доступные типы полей в `FormFieldDef`:
- `kind: "text" | "textarea" | "email" | "tel"` — скалярные
- `kind: "select"` — дропдаун с `options: SelectOption[]`
- `kind: "list"` — динамический список (как «Товары»)

### 4. Зарегистрировать в реестрах

`src/templates/registry.ts`:
```ts
import { myTemplate } from "./my-template/schema";
const all: TemplateDefinition[] = [declarationEaeuLight, myTemplate];
```

`src/templates/clientCompose.ts` (если есть `derive`):
```ts
import { composeMyTemplate } from "./my-template/compose";

export const clientDerivers: Record<string, ClientDeriveFn | undefined> = {
  "declaration-eaeu-light": ...,
  "my-template": (data) => composeMyTemplate({ ... }),
};
```

### 5. Прогнать smoke-тест

```powershell
# Type-check
npx tsc --noEmit

# Production build (проверит компиляцию роутов)
npm run build

# Composer smoke-test (если есть)
npx tsx scripts/test-compose.ts
```

И вручную: открой http://localhost:3002 — на главной должна появиться карточка
нового шаблона. Кликни → форма рендерится из секций. Сабмить → DOCX
генерится с подстановкой.

## Что НЕ требует изменений

- `src/app/apply/[slug]/form.tsx` — рендер формы из секций универсальный
- `src/app/api/submit/route.ts` — приёмка заявки одна для всех
- `src/app/admin/*` — админка читает поля из `TemplateDefinition.adminMetadata`
- `src/lib/docx.ts` — генератор универсальный, шаблон-специфика в DOCX

## Структура `derive`

`derive` — это **единственный способ** добавить кастомную логику между формой
и шаблоном. Он вызывается:
- В клиенте через `clientCompose.ts` — для live-preview по мере заполнения формы
- На сервере (через `TemplateDefinition.derive`) — для надёжности перед рендером
  (можно не вызывать, если client уже всё посчитал)

Идеально, если client-side и server-side composer — **одна и та же функция**,
импортируемая из одного `compose.ts`. Не дублируй логику.
