# Декларации и сертификаты — приёмка заявок

Клиент заполняет форму → получает готовый DOCX-макет на email и в Telegram-бот для менеджера. Админка позволяет вручную проставить регистрационный номер, дату регистрации, срок действия и номер протокола, после чего пересобрать финальный документ.

## Стек

- Next.js 15 (App Router, TypeScript)
- Prisma + SQLite (один файл — `data/prod.db`, легко бэкапится)
- docxtemplater — подстановка `{placeholders}` и циклов `{#products}...{/products}` в DOCX-шаблон
- react-hook-form + zod — клиентская форма + серверная валидация
- iron-session — cookie-авторизация админки
- Telegraf — отправка в Telegram
- nodemailer — SMTP email
- Tailwind CSS — UI

## Локальный запуск

```bash
npm install
cp .env.example .env
# отредактируйте .env (минимум: ADMIN_PASSWORD, SESSION_SECRET)
npx prisma db push
npm run dev
```

Откройте http://localhost:3000 — публичная форма.
http://localhost:3000/admin — админка (логин из `.env`).

## Деплой (Docker)

На клиентский Linux-сервер (Ubuntu 22.04 / Debian 12, нужен Docker и Docker Compose):

```bash
# 1) Распаковать репозиторий в /opt/global-test (или любую папку)
cd /opt/global-test

# 2) Подготовить .env
cp .env.example .env
nano .env   # заполнить все обязательные переменные

# 3) Создать каталоги для данных
mkdir -p data storage

# 4) Запустить
docker compose build
docker compose up -d

# 5) Применить миграции БД (первый запуск)
docker compose exec app npx prisma db push
```

Приложение слушает на порту `3000`. За HTTPS поставьте nginx или Caddy.

### Обновление после изменений в коде

```bash
git pull
docker compose build
docker compose up -d
# Если в prisma/schema.prisma были изменения:
docker compose exec app npx prisma db push
```

## Переменные окружения (`.env`)

| Переменная | Назначение | Обязательная |
|---|---|---|
| `DATABASE_URL` | строка подключения Prisma | да (для Docker задана в compose) |
| `STORAGE_DIR` | путь к каталогу с сгенерированными DOCX | да (для Docker задано в compose) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | логин/пароль админки | да |
| `SESSION_SECRET` | 64+ символа hex для cookie. Сгенерировать: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"` | да |
| `TELEGRAM_BOT_TOKEN` | токен бота от @BotFather | для уведомлений |
| `TELEGRAM_CHAT_ID` | chat_id куда слать (узнать: написать боту, открыть `https://api.telegram.org/bot<TOKEN>/getUpdates`) | для уведомлений |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | SMTP-сервер для email | для email |
| `NOTIFY_EMAIL_TO` | email менеджера через запятую | для email менеджеру |
| `PUBLIC_BASE_URL` | публичный URL сайта (для ссылок в письмах) | да |

Если Telegram или SMTP не настроены — соответствующие уведомления тихо пропускаются, ошибок не будет.

## Структура проекта

```
src/
├── app/
│   ├── page.tsx                      # лендинг — список шаблонов
│   ├── apply/[slug]/                 # публичная форма заявки
│   ├── admin/                        # админка (login, list, [id] детали)
│   └── api/
│       ├── submit/                   # приём заявки
│       └── admin/                    # серверные операции админки
├── templates/
│   ├── registry.ts                   # реестр всех шаблонов
│   ├── types.ts                      # типы FormFieldDef, TemplateDefinition
│   └── declaration-eaeu-light/
│       └── schema.ts                 # zod-схема + UI-метаданные
├── lib/
│   ├── docx.ts                       # docxtemplater wrapper
│   ├── db.ts                         # Prisma client
│   ├── storage.ts                    # запись/чтение DOCX из STORAGE_DIR
│   ├── auth.ts                       # iron-session
│   ├── telegram.ts                   # Telegraf
│   └── email.ts                      # nodemailer
└── components/ui/                    # минимальные UI-примитивы

templates/
└── declaration-eaeu-light/
    └── template.docx                 # исходный DOCX с {плейсхолдерами}

prisma/schema.prisma                  # модель Application
```

## Добавление нового типа документа

1. Положите исходный DOCX-макет и пометьте поля, которые заполняет клиент.
2. Преобразуйте макет в шаблон с `{placeholders}` (для циклов используйте `{#items}...{/items}` в первой и последней ячейке табличной строки).
3. Создайте `src/templates/<slug>/schema.ts` с экспортом `TemplateDefinition` (см. `declaration-eaeu-light/schema.ts` как образец).
4. Добавьте в `src/templates/registry.ts` импорт и запись.
5. Готово — на главной появится новая карточка, форма отрендерится из секций автоматически, генератор подставит данные по тем же правилам.

## Бэкапы

База — один файл `data/prod.db`. Простой cron:

```cron
0 3 * * * cd /opt/global-test && cp data/prod.db backups/prod-$(date +\%F).db && find backups/ -mtime +30 -delete
```

Сгенерированные DOCX лежат в `storage/<application-id>/{draft,final}.docx`.
