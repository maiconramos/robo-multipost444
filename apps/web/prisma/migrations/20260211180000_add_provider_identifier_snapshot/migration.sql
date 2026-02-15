-- Add provider identifier as canonical provider key on accounts and platform posts.

ALTER TABLE "social_account"
  ADD COLUMN IF NOT EXISTS "providerIdentifier" TEXT;

UPDATE "social_account"
SET "providerIdentifier" = LOWER("connectionMethod"::text) || '.' || LOWER("platform"::text)
WHERE "providerIdentifier" IS NULL;

ALTER TABLE "social_account"
  ALTER COLUMN "providerIdentifier" SET NOT NULL;

ALTER TABLE "platform_post"
  ADD COLUMN IF NOT EXISTS "providerIdentifier" TEXT;

UPDATE "platform_post" AS pp
SET "providerIdentifier" = COALESCE(
  sa."providerIdentifier",
  LOWER(sa."connectionMethod"::text) || '.' || LOWER(sa."platform"::text)
)
FROM "social_account" AS sa
WHERE pp."accountId" = sa."id"
  AND pp."providerIdentifier" IS NULL;

ALTER TABLE "platform_post"
  ALTER COLUMN "providerIdentifier" SET NOT NULL;
