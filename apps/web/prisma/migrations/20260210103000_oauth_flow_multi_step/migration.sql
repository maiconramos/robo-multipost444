-- OAuth flow persistence for multi-step BYO OAuth callbacks

DO $$
BEGIN
  CREATE TYPE "OAuthFlowStatus" AS ENUM (
    'AWAITING_SELECTION',
    'COMPLETED',
    'EXPIRED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "oauth_flow" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "socialAccountId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "status" "OAuthFlowStatus" NOT NULL DEFAULT 'AWAITING_SELECTION',
  "publicCandidates" JSONB NOT NULL,
  "contextEnc" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "oauth_flow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "oauth_flow_workspaceId_status_expiresAt_idx"
  ON "oauth_flow"("workspaceId", "status", "expiresAt");

CREATE INDEX IF NOT EXISTS "oauth_flow_workspaceId_socialAccountId_status_idx"
  ON "oauth_flow"("workspaceId", "socialAccountId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'oauth_flow_workspaceId_fkey'
      AND table_name = 'oauth_flow'
  ) THEN
    ALTER TABLE "oauth_flow"
      ADD CONSTRAINT "oauth_flow_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'oauth_flow_socialAccountId_fkey'
      AND table_name = 'oauth_flow'
  ) THEN
    ALTER TABLE "oauth_flow"
      ADD CONSTRAINT "oauth_flow_socialAccountId_fkey"
      FOREIGN KEY ("socialAccountId") REFERENCES "social_account"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
