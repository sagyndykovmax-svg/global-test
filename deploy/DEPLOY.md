# Deployment guide — global-test на Contabo

Сервер: `213.199.60.76` (SSH `root@213.199.60.76`).
Поддомен: `forms.legacygroup.work`.
Каталог на сервере: `/opt/global-test/`.
Внутренний порт контейнера: `3010` (наружу через nginx).

## Шаг 0 — Локально (на твоём ноуте, выполнить ОДИН РАЗ)

```powershell
cd C:\Users\Admin\Documents\GitHub\global-test

# 1. Положить production .env шаблон (если ещё нет в .env то переименовать template):
copy deploy\env.production.template .env.production

# 2. Сгенерировать новый SESSION_SECRET для прода (отличается от dev):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# скопировать вывод → вставить в deploy\env.production.template вместо ВСТАВЬ_СВЕЖИЙ_...

# 3. Поменять ADMIN_PASSWORD в deploy\env.production.template на безопасный

# 4. Создать архив проекта (без node_modules, .env, .next, data, storage):
tar -czf C:\tmp\global-test-deploy.tar.gz `
  --exclude='node_modules' `
  --exclude='.next' `
  --exclude='.env' `
  --exclude='data' `
  --exclude='storage' `
  --exclude='test-output*.docx' `
  --exclude='dev.db*' `
  -C C:\Users\Admin\Documents\GitHub\ global-test
```

## Шаг 1 — DNS

У регистратора домена `legacygroup.work` добавить:

```
Тип:  A
Имя:  forms
Знач: 213.199.60.76
TTL:  300
```

Подождать 5-30 минут, проверить:
```powershell
nslookup forms.legacygroup.work
```
Должен вернуть `213.199.60.76`.

## Шаг 2 — Залить архив на сервер

С твоего ноута:
```powershell
scp C:\tmp\global-test-deploy.tar.gz root@213.199.60.76:/root/
```

## Шаг 3 — На сервере: создать каталог, распаковать, настроить .env

SSH на сервер: `ssh root@213.199.60.76`

```bash
# Создать каталог проекта
mkdir -p /opt/global-test
cd /opt/global-test

# Распаковать (--strip-components=1 чтобы вылезло без обёрнутой папки)
tar -xzf /root/global-test-deploy.tar.gz --strip-components=1
rm /root/global-test-deploy.tar.gz

# Создать .env из шаблона
cp deploy/env.production.template .env
nano .env
# проверить что SESSION_SECRET / ADMIN_PASSWORD / GEMINI_API_KEY заполнены

# Создать каталоги для persistent данных (БД + сгенерированные DOCX)
mkdir -p data storage
```

## Шаг 4 — Собрать и запустить Docker контейнер

```bash
cd /opt/global-test

# Сборка (займёт ~3-5 мин — npm install + next build)
docker compose build

# Запуск
docker compose up -d

# Проверить что контейнер живой
docker compose ps
docker compose logs --tail=50

# Применить миграцию БД (создаст таблицу Application в data/prod.db)
docker compose exec app npx prisma db push

# Тест: запрос на localhost:3010 должен вернуть HTML главной страницы
curl -I http://127.0.0.1:3010
```

Ожидаемый ответ — `HTTP/1.1 200 OK`.

## Шаг 5 — Настройка nginx

```bash
# Скопировать конфиг
cp /opt/global-test/deploy/nginx-forms.legacygroup.work.conf \
   /etc/nginx/sites-available/forms.legacygroup.work

# ВРЕМЕННО упростить конфиг для certbot (закомментировать HTTPS блок до получения сертификата)
# Создать минимальную HTTP-only версию:
cat > /etc/nginx/sites-enabled/forms.legacygroup.work <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name forms.legacygroup.work;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
EOF

# Проверить синтаксис и перезагрузить
nginx -t
systemctl reload nginx

# Должно работать по HTTP:
curl -I http://forms.legacygroup.work
```

## Шаг 6 — SSL через certbot

```bash
# Получить сертификат (certbot сам обновит nginx-конфиг до HTTPS)
certbot --nginx -d forms.legacygroup.work --non-interactive --agree-tos -m sagyndykovmax@gmail.com

# certbot обновит /etc/nginx/sites-enabled/forms.legacygroup.work и перезагрузит nginx.
# Проверить HTTPS:
curl -I https://forms.legacygroup.work
```

## Шаг 7 — Финальная проверка

1. Открыть https://forms.legacygroup.work в браузере — должна быть главная (карточка шаблона)
2. Перейти на форму, заполнить пробную заявку, сабмитнуть
3. Проверить Telegram — должно прийти уведомление с DOCX вложением
4. Открыть https://forms.legacygroup.work/admin — войти `admin` / тот пароль что в .env

## Обновление в будущем (без архива)

Когда захочешь обновить код:

**Вариант А — снова через tar.gz**:
- На ноуте: сделать новый архив (как в Шаге 0)
- На сервере: `cd /opt/global-test && tar -xzf /root/global-test-deploy-NEW.tar.gz --strip-components=1`
- `docker compose build && docker compose up -d`
- Если меняли prisma/schema.prisma: `docker compose exec app npx prisma db push`

**Вариант Б — через git (рекомендую)**:
1. Запушить локальный репо в GitHub (если не сделано)
2. На сервере: `cd /opt/global-test && git pull && docker compose build && docker compose up -d`

## Бэкап БД

В `/etc/cron.daily/global-test-backup.sh`:
```bash
#!/bin/bash
cd /opt/global-test
mkdir -p backups
cp data/prod.db backups/prod-$(date +%F).db
find backups/ -name 'prod-*.db' -mtime +30 -delete
```
```bash
chmod +x /etc/cron.daily/global-test-backup.sh
```

## Логи и отладка

```bash
# Application logs
docker compose -f /opt/global-test/docker-compose.yml logs --tail=200 -f

# nginx access log
tail -f /var/log/nginx/forms.legacygroup.work.access.log

# nginx error log
tail -f /var/log/nginx/forms.legacygroup.work.error.log

# Тест API изнутри сервера
curl -X POST http://127.0.0.1:3010/api/submit -H "Content-Type: application/json" -d '{"slug":"x","data":{}}'
```

## Если что-то сломалось

- Контейнер не запускается → `docker compose logs --tail=200`
- nginx 502 Bad Gateway → проверить что `docker compose ps` показывает `running`, и `curl http://127.0.0.1:3010` работает
- HTTPS не получился → проверить DNS `nslookup forms.legacygroup.work` — должен указывать на сервер
- Telegram не приходит → проверить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env`, перезапустить контейнер `docker compose restart app`
