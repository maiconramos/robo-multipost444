CREATE TYPE "public"."ConnectionMethod" AS ENUM('BYO_OAUTH', 'BYO_SYSTEM_USER', 'LATE');--> statement-breakpoint
CREATE TYPE "public"."CredentialKind" AS ENUM('APP_ID', 'APP_SECRET', 'ACCESS_TOKEN', 'REFRESH_TOKEN', 'SYSTEM_USER_TOKEN', 'LATE_API_KEY');--> statement-breakpoint
CREATE TYPE "public"."OAuthFlowStatus" AS ENUM('AWAITING_SELECTION', 'COMPLETED', 'EXPIRED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."SocialAccountStatus" AS ENUM('CONNECTED', 'DISCONNECTED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."SocialPlatform" AS ENUM('INSTAGRAM', 'FACEBOOK', 'THREADS', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'X', 'PINTEREST');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"keyHash" text NOT NULL,
	"lastUsedAt" timestamp,
	"expiresAt" timestamp,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "credential" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"socialAccountId" text,
	"kind" "CredentialKind",
	"encryptedValue" text,
	"last4" text,
	"expiresAt" timestamp,
	"type" text,
	"keyEnc" text,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cron_job" (
	"id" text PRIMARY KEY NOT NULL,
	"postId" text NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 3 NOT NULL,
	"lastError" text,
	"lockedAt" timestamp,
	"lockedBy" text,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cron_job_postId_unique" UNIQUE("postId")
);
--> statement-breakpoint
CREATE TABLE "invite" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"acceptedAt" timestamp,
	CONSTRAINT "invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"key" text,
	"provider" text,
	"filename" text,
	"contentType" text,
	"width" integer,
	"height" integer,
	"size" integer,
	"duration" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_item" (
	"id" text PRIMARY KEY NOT NULL,
	"postId" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"key" text,
	"provider" text,
	"filename" text,
	"contentType" text,
	"width" integer,
	"height" integer,
	"size" integer,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "oauth_flow" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"socialAccountId" text NOT NULL,
	"profileId" text NOT NULL,
	"platform" "SocialPlatform" NOT NULL,
	"status" "OAuthFlowStatus" DEFAULT 'AWAITING_SELECTION' NOT NULL,
	"publicCandidates" json NOT NULL,
	"contextEnc" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"completedAt" timestamp,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_post" (
	"id" text PRIMARY KEY NOT NULL,
	"postId" text NOT NULL,
	"accountId" text NOT NULL,
	"platform" text NOT NULL,
	"providerIdentifier" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"platformPostId" text,
	"platformPostUrl" text,
	"errorMessage" text,
	"customContent" text,
	"platformData" json,
	"publishedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"profileId" text NOT NULL,
	"socialAccountId" text,
	"content" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduledFor" timestamp,
	"publishedAt" timestamp,
	"timezone" text,
	"providerType" text,
	"latePostId" text,
	"queueId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"name" text NOT NULL,
	"lateProfileId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue" (
	"id" text PRIMARY KEY NOT NULL,
	"profileId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"queueId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"time" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_account" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"profileId" text NOT NULL,
	"platform" "SocialPlatform" NOT NULL,
	"connectionMethod" "ConnectionMethod" NOT NULL,
	"providerIdentifier" text NOT NULL,
	"status" "SocialAccountStatus" DEFAULT 'CONNECTED' NOT NULL,
	"handle" text NOT NULL,
	"name" text,
	"meta" json,
	"platformUserId" text,
	"username" text NOT NULL,
	"displayName" text,
	"profilePicture" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"providerType" text,
	"lateAccountId" text,
	"accessTokenEnc" text,
	"refreshTokenEnc" text,
	"tokenExpiresAt" timestamp,
	"oauthMetadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_socialAccountId_social_account_id_fk" FOREIGN KEY ("socialAccountId") REFERENCES "public"."social_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cron_job" ADD CONSTRAINT "cron_job_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_item" ADD CONSTRAINT "media_item_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_flow" ADD CONSTRAINT "oauth_flow_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_flow" ADD CONSTRAINT "oauth_flow_socialAccountId_social_account_id_fk" FOREIGN KEY ("socialAccountId") REFERENCES "public"."social_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_post" ADD CONSTRAINT "platform_post_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_post" ADD CONSTRAINT "platform_post_accountId_social_account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."social_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_socialAccountId_social_account_id_fk" FOREIGN KEY ("socialAccountId") REFERENCES "public"."social_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_queueId_queue_id_fk" FOREIGN KEY ("queueId") REFERENCES "public"."queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue" ADD CONSTRAINT "queue_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue" ADD CONSTRAINT "queue_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_slot" ADD CONSTRAINT "queue_slot_queueId_queue_id_fk" FOREIGN KEY ("queueId") REFERENCES "public"."queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_account" ADD CONSTRAINT "social_account_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_account" ADD CONSTRAINT "social_account_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_prefix_idx" ON "api_key" USING btree ("prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "credential_workspace_type_idx" ON "credential" USING btree ("workspaceId","type");--> statement-breakpoint
CREATE UNIQUE INDEX "credential_account_kind_idx" ON "credential" USING btree ("socialAccountId","kind");--> statement-breakpoint
CREATE INDEX "credential_workspace_account_idx" ON "credential" USING btree ("workspaceId","socialAccountId");--> statement-breakpoint
CREATE INDEX "cron_job_status_scheduled_idx" ON "cron_job" USING btree ("status","scheduledAt");--> statement-breakpoint
CREATE INDEX "media_asset_workspace_created_idx" ON "media_asset" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "oauth_flow_workspace_status_expires_idx" ON "oauth_flow" USING btree ("workspaceId","status","expiresAt");--> statement-breakpoint
CREATE INDEX "oauth_flow_workspace_account_status_idx" ON "oauth_flow" USING btree ("workspaceId","socialAccountId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "social_account_workspace_platform_handle_method_idx" ON "social_account" USING btree ("workspaceId","platform","handle","connectionMethod");--> statement-breakpoint
CREATE UNIQUE INDEX "social_account_profile_platform_user_idx" ON "social_account" USING btree ("profileId","platform","platformUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_workspace_user_idx" ON "workspace_member" USING btree ("workspaceId","userId");