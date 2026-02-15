-- Multi-connector per social account + per-account credentials

DO $$
BEGIN
  CREATE TYPE "SocialPlatform" AS ENUM (
    'INSTAGRAM',
    'FACEBOOK',
    'THREADS',
    'TIKTOK',
    'YOUTUBE',
    'LINKEDIN',
    'X',
    'PINTEREST'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "ConnectionMethod" AS ENUM (
    'BYO_OAUTH',
    'BYO_SYSTEM_USER',
    'LATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "SocialAccountStatus" AS ENUM (
    'CONNECTED',
    'DISCONNECTED',
    'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "CredentialKind" AS ENUM (
    'APP_ID',
    'APP_SECRET',
    'ACCESS_TOKEN',
    'REFRESH_TOKEN',
    'SYSTEM_USER_TOKEN',
    'LATE_API_KEY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- social_account: new connector model fields
ALTER TABLE "social_account"
  ADD COLUMN IF NOT EXISTS "platform_v2" "SocialPlatform",
  ADD COLUMN IF NOT EXISTS "connectionMethod" "ConnectionMethod",
  ADD COLUMN IF NOT EXISTS "status" "SocialAccountStatus" DEFAULT 'CONNECTED',
  ADD COLUMN IF NOT EXISTS "handle" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "meta" JSONB;

UPDATE "social_account"
SET "platform_v2" = CASE LOWER("platform")
  WHEN 'instagram' THEN 'INSTAGRAM'::"SocialPlatform"
  WHEN 'facebook' THEN 'FACEBOOK'::"SocialPlatform"
  WHEN 'threads' THEN 'THREADS'::"SocialPlatform"
  WHEN 'tiktok' THEN 'TIKTOK'::"SocialPlatform"
  WHEN 'youtube' THEN 'YOUTUBE'::"SocialPlatform"
  WHEN 'linkedin' THEN 'LINKEDIN'::"SocialPlatform"
  WHEN 'twitter' THEN 'X'::"SocialPlatform"
  WHEN 'x' THEN 'X'::"SocialPlatform"
  WHEN 'pinterest' THEN 'PINTEREST'::"SocialPlatform"
  ELSE 'INSTAGRAM'::"SocialPlatform"
END
WHERE "platform_v2" IS NULL;

UPDATE "social_account"
SET "connectionMethod" = CASE LOWER(COALESCE("providerType", 'byo'))
  WHEN 'late' THEN 'LATE'::"ConnectionMethod"
  WHEN 'byo' THEN 'BYO_OAUTH'::"ConnectionMethod"
  ELSE 'BYO_OAUTH'::"ConnectionMethod"
END
WHERE "connectionMethod" IS NULL;

UPDATE "social_account"
SET "handle" = COALESCE(NULLIF("username", ''), CONCAT('account-', LEFT("id", 8)))
WHERE "handle" IS NULL;

UPDATE "social_account"
SET "name" = "displayName"
WHERE "name" IS NULL;

UPDATE "social_account"
SET "meta" = "oauthMetadata"
WHERE "meta" IS NULL AND "oauthMetadata" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'social_account_profileId_platform_platformUserId_key'
  ) THEN
    DROP INDEX "social_account_profileId_platform_platformUserId_key";
  END IF;
END
$$;

ALTER TABLE "social_account" DROP COLUMN IF EXISTS "platform";
ALTER TABLE "social_account" RENAME COLUMN "platform_v2" TO "platform";

ALTER TABLE "social_account"
  ALTER COLUMN "platform" SET NOT NULL,
  ALTER COLUMN "connectionMethod" SET NOT NULL,
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "handle" SET NOT NULL;

ALTER TABLE "social_account"
  ALTER COLUMN "providerType" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "social_account_workspaceId_platform_handle_connectionMethod_key"
  ON "social_account"("workspaceId", "platform", "handle", "connectionMethod");

CREATE UNIQUE INDEX IF NOT EXISTS "social_account_profileId_platform_platformUserId_key"
  ON "social_account"("profileId", "platform", "platformUserId");

-- credential: support per-social-account secrets while keeping workspace-level legacy entries
ALTER TABLE "credential"
  ADD COLUMN IF NOT EXISTS "socialAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "kind" "CredentialKind",
  ADD COLUMN IF NOT EXISTS "encryptedValue" TEXT,
  ADD COLUMN IF NOT EXISTS "last4" TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "credential"
  ALTER COLUMN "type" DROP NOT NULL,
  ALTER COLUMN "keyEnc" DROP NOT NULL;

UPDATE "credential"
SET "createdAt" = CURRENT_TIMESTAMP
WHERE "createdAt" IS NULL;

UPDATE "credential"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "credential"
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "credential_socialAccountId_kind_key"
  ON "credential"("socialAccountId", "kind");

CREATE INDEX IF NOT EXISTS "credential_workspaceId_socialAccountId_idx"
  ON "credential"("workspaceId", "socialAccountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'credential_socialAccountId_fkey'
      AND table_name = 'credential'
  ) THEN
    ALTER TABLE "credential"
      ADD CONSTRAINT "credential_socialAccountId_fkey"
      FOREIGN KEY ("socialAccountId") REFERENCES "social_account"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- post: route publishing through selected socialAccount
ALTER TABLE "post"
  ADD COLUMN IF NOT EXISTS "socialAccountId" TEXT;

ALTER TABLE "post"
  ALTER COLUMN "providerType" DROP NOT NULL;

UPDATE "post" p
SET "socialAccountId" = pp."accountId"
FROM (
  SELECT DISTINCT ON ("postId") "postId", "accountId"
  FROM "platform_post"
  ORDER BY "postId", "publishedAt" DESC NULLS LAST, "id"
) pp
WHERE p."id" = pp."postId"
  AND p."socialAccountId" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'post_socialAccountId_fkey'
      AND table_name = 'post'
  ) THEN
    ALTER TABLE "post"
      ADD CONSTRAINT "post_socialAccountId_fkey"
      FOREIGN KEY ("socialAccountId") REFERENCES "social_account"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
