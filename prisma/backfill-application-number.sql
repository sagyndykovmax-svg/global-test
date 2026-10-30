-- Нумерует старые заявки по дате создания. Запускается один раз после db push.
UPDATE "Application"
SET "number" = (
  SELECT COUNT(*) FROM "Application" AS earlier
  WHERE earlier."createdAt" < "Application"."createdAt"
     OR (earlier."createdAt" = "Application"."createdAt" AND earlier."id" <= "Application"."id")
)
WHERE "number" IS NULL;
