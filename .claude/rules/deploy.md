# Rule: деплой

Деплой на **VPS клиента** (не Контабо!) через Docker Compose. Один контейнер с
Next.js приложением, SQLite в bind-mount, генерируемые DOCX в bind-mount.

## Системные требования к серверу

- Linux (Ubuntu 22.04+ / Debian 12+)
- Docker 20+ и Docker Compose v2
- 1 vCPU, 1 GB RAM, 10 GB диск — на пару сотен заявок в день
- Открыт порт 3000 для приложения (можно за nginx/Caddy для HTTPS)

## Первый деплой

```bash
# 1. Скопировать репозиторий
cd /opt
git clone <repo-url> global-test
cd global-test

# 2. Подготовить .env
cp .env.example .env
nano .env   # заполнить все обязательные переменные

# 3. Создать каталоги для данных
mkdir -p data storage

# 4. Запустить
docker compose build
docker compose up -d

# 5. Применить миграции БД (только первый раз)
docker compose exec app npx prisma db push

# 6. Проверить
curl http://localhost:3000
```

## Обновление кода

```bash
cd /opt/global-test
git pull
docker compose build
docker compose up -d
# Если меняли prisma/schema.prisma:
docker compose exec app npx prisma db push
```

Идемпотентно — повторный запуск на той же ревизии не делает ничего.

## Обновление .env

`docker compose restart` НЕ перечитывает `.env`. После правки:

```bash
docker compose up -d --force-recreate app
```

## Бэкапы

База — один файл `data/prod.db`. В cron клиентского сервера:

```cron
0 3 * * * cd /opt/global-test && cp data/prod.db backups/prod-$(date +\%F).db && find backups/ -mtime +30 -delete
```

Сгенерированные DOCX лежат в `storage/<application-id>/{draft,final}.docx` —
бэкапятся при необходимости через `tar -czf`.

## HTTPS

Простейший вариант — nginx как reverse-proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    client_max_body_size 10M;   # на случай больших вложений в форме
}
```

И в `.env` обновить `PUBLIC_BASE_URL="https://example.com"`.

## Что не использовать

- **GitHub Pages** — статический хостинг, не работает (нужен Node.js, БД, файлы)
- **Vercel** — требует переписать SQLite на Postgres и disk-storage на S3/Blob.
  Архитектура под VPS, не под serverless

Подробнее: см. истории сравнений в [PROGRESS.md](../../PROGRESS.md).
