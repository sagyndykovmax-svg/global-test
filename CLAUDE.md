# global-test — Claude Code guide

Платформа приёма заявок на декларации и сертификаты соответствия ЕАЭС.
Клиент заполняет форму → система автогенерирует готовый DOCX-макет → менеджер
получает уведомление в Telegram + email с прикреплённым документом.

## Стек

- **Next.js 15** (App Router, TypeScript) — одно приложение: публичная форма + API + админка
- **Prisma + SQLite** — БД в одном файле `data/prod.db`, тривиальный бэкап
- **docxtemplater** — подстановка `{плейсхолдеров}` и циклов `{#products}...{/products}` в DOCX
- **react-hook-form + zod** — клиентская форма с динамическим списком позиций
- **iron-session** — cookie-авторизация админки (одиночный логин/пароль из `.env`)
- **Telegraf** — отправка уведомлений в Telegram (текст + DOCX вложением)
- **nodemailer** — SMTP-email для менеджера (клиентам письма НЕ отправляются)
- **Tailwind CSS + минимальный shadcn-style UI** — компоненты `src/components/ui/`

## Структура проекта

```
src/
├── app/
│   ├── page.tsx                          # лендинг — список шаблонов
│   ├── apply/[slug]/                     # публичная форма заявки
│   ├── admin/                            # /admin/login, list, [id] детали
│   └── api/
│       ├── submit/                       # POST приём заявки
│       └── admin/                        # серверные операции админки
├── templates/
│   ├── types.ts                          # TemplateDefinition + FormFieldDef
│   ├── registry.ts                       # реестр шаблонов
│   ├── clientCompose.ts                  # client-side derive-функции (live preview)
│   └── declaration-eaeu-light/
│       ├── compose.ts                    # композер описания + ГОСТы + has_appendix
│       └── schema.ts                     # zod-схема + UI-метаданные + derive хук
├── lib/
│   ├── docx.ts                           # docxtemplater wrapper
│   ├── db.ts                             # Prisma client
│   ├── storage.ts                        # запись/чтение DOCX из STORAGE_DIR
│   ├── auth.ts                           # iron-session
│   ├── telegram.ts                       # Telegraf
│   └── email.ts                          # nodemailer
└── components/ui/                        # Input, Textarea, Button, Label

templates/
└── <slug>/template.docx                  # исходные DOCX-шаблоны с {плейсхолдерами}

prisma/schema.prisma                      # модель Application
scripts/                                  # smoke-tests + генераторы матриц (см. .claude/rules/testing.md)
docs/                                     # справочники: памятка методики, словарь составов, test-matrix-full
.claude/rules/                            # операционные правила (см. список ниже)
```

## Архитектура многошаблонности

Каждый ТР ТС / тип сертификата — отдельная папка в `src/templates/<slug>/` со
своим **composer'ом** (compose.ts), **zod-схемой** (schema.ts) и **DOCX-макетом**
с `{плейсхолдерами}`. Общая логика (форма, API, админка, реестр) не трогается.

`TemplateDefinition` поддерживает опциональный `derive(data)` хук — функция, которая
вычисляет производные поля из других значений формы. Тот же `derive` дублируется
на клиенте через `clientCompose.ts` для live-обновления полей по мере заполнения
формы.

Подробно: [.claude/rules/multi-template.md](.claude/rules/multi-template.md).

## Правила формата для деклараций одежды (ТР ТС 017/2011)

Композер реализует **официальную методику заказчика** ([`docs/памятка_методика_формулировок.docx`](docs/памятка_методика_формулировок.docx))
+ скорректированный словарь составов от пользователя ([`docs/composition-dictionary.docx`](docs/composition-dictionary.docx)).

Ключевые правила (полностью описаны в [`.claude/rules/decl-format.md`](.claude/rules/decl-format.md)):

- **Слойность 1/2/3** — определяется по словарю изделий (фуфайки→1, платья→2, пальто→3)
- **Носитель**: швейные → «ткань», трикотаж → «пряжа». Связка: «сочетание» / «смесь» соответственно
- **Названия тканей** — иерархия лён ≥30% → шерсть ≥30% → хлопок СТРОГО >50% → шёлк >50% → синт/искусств
- **Хвост примеси**: ≤10% → «с вложением», >10% → «в смеси/сочетании»
- **Без скобок с %** в описании (хотя памятка их показывает — пользователь явно попросил убрать)
- **«В комплектах и отдельными предметами»** не пишется — только двоеточие перед ассортиментом
- **ГОСТ 25294** платьево-блузочный (платья/блузки/юбки), **ГОСТ 25295** пальтово-костюмный
  (пальто/куртки + **костюмы/пиджаки/жакеты/жилеты** через `SUIT_PATTERNS`)
- **Перечень изделий** канонизируется по ГОСТ 17037-2022 (худи → толстовки + модель «худи»,
  бриджи → брюки + модель «бриджи» и т.д.). Агрегация base+models в `formatAssortment`
- **ТН ВЭД 10 знаков** — материал-цифры по правилу СТРОГО >50% доминанта; EAEU-специфика
  в `EAEU_LAST_4_OVERRIDES` (пополняется по подтверждениям таможни)

**Уведомления** — только Telegram + email менеджера; клиентам письма НЕ отправляются.

**Памятка как нормативный источник** хранится в репозитории: [`docs/памятка_методика_формулировок.docx`](docs/памятка_методика_формулировок.docx).

## Local dev

```powershell
cd C:\Users\Admin\Documents\GitHub\global-test
npm install
cp .env.example .env
# отредактировать .env (минимум ADMIN_PASSWORD, SESSION_SECRET)
npx prisma db push
npm run dev -- -p 3002
```

- Форма: http://localhost:3002/apply/declaration-eaeu-light
- Админка: http://localhost:3002/admin

**Порт 3002** — закреплён за этим проектом (3000 = Arab Employment, 3001 = Life
Navigator, 5173 = Legacy HR Bot).

## Деплой

Docker Compose на VPS клиента (не Контабо). Стандартная процедура:

```bash
cd /opt/global-test
git pull
docker compose build
docker compose up -d
docker compose exec app npx prisma db push   # если меняли schema.prisma
```

Подробно: [.claude/rules/deploy.md](.claude/rules/deploy.md).

## Env vars (`.env`)

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | строка подключения Prisma (для Docker задана в compose) |
| `STORAGE_DIR` | путь к каталогу с сгенерированными DOCX |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | логин/пароль админки |
| `SESSION_SECRET` | 64+ символа hex — `node -e "console.log(crypto.randomBytes(32).toString('hex'))"` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | бот и чат для уведомлений менеджеру |
| `SMTP_*` + `NOTIFY_EMAIL_TO` | email-уведомления менеджеру |
| `PUBLIC_BASE_URL` | публичный URL (для ссылок в письмах) |
| `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENAI_API_KEY` | LLM-классификация ТН ВЭД. Приоритет: Gemini (БЕСПЛАТНО) → Groq (БЕСПЛАТНО) → OpenAI (платно). Без ключей — rule-based fallback |

Если Telegram/SMTP не настроены — соответствующие уведомления тихо пропускаются.

## Гетчи

1. **Next.js читает .env только при старте** — после правки `.env` нужно перезапустить dev-сервер
   (Ctrl+C + `npm run dev -- -p 3002`).
2. **Prisma Client регенерируется** при изменении `schema.prisma` — затем `npx prisma db push`
   применяет миграцию. В Docker prod: `docker compose exec app npx prisma db push`.
3. **DOCX-шаблон редактируется через unpack→XML→pack** — нельзя править через
   Word после того, как там есть `{плейсхолдеры}` (Word может разорвать их на
   несколько `<w:r>`, и docxtemplater перестанет их находить).
4. **Worker зависает на Windows при `prisma generate`** если dev-сервер крутится —
   останови dev перед `npm run build`.
5. **Костюмы / пиджаки / жакеты / жилеты — 2-й слой по слойности, но ГОСТ 25295**
   (костюмный ассортимент). В коде это разделено: `OUTERWEAR_PATTERNS` отвечает только
   за определение слоя, а `SUIT_PATTERNS` — за выбор ГОСТа. Не пересекаются.
6. **При правке `compose.ts` обязательно прогнать 4 смок-теста** (test-dict-cases, test-tnved,
   test-gosts, test-compose-full). 0 регрессий — иначе не двигаться дальше. См. [testing.md](.claude/rules/testing.md).

## Связанные документы

- [PROGRESS.md](PROGRESS.md) — журнал изменений
- [.claude/rules/karpathy-guidelines.md](.claude/rules/karpathy-guidelines.md) — поведенческие принципы (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution)
- [.claude/rules/decl-format.md](.claude/rules/decl-format.md) — полные правила формата деклараций (все правила Phase 5)
- [.claude/rules/testing.md](.claude/rules/testing.md) — смок-тесты + матрицы
- [.claude/rules/multi-template.md](.claude/rules/multi-template.md) — добавление новых шаблонов
- [.claude/rules/deploy.md](.claude/rules/deploy.md) — деплой
- [docs/памятка_методика_формулировок.docx](docs/памятка_методика_формулировок.docx) — официальная методика заказчика
- [docs/composition-dictionary.docx](docs/composition-dictionary.docx) — справочник состав → формулировка (39 кейсов)
- [docs/test-matrix-full.docx](docs/test-matrix-full.docx) — полная тестовая матрица (505 кейсов)
- [README.md](README.md) — внешняя инструкция по запуску
