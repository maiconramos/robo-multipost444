/**
 * Application tables for Robo MultiPost
 *
 * All tables use workspace-scoped relations.
 * Table names match existing Prisma @@map values for compatibility.
 */
import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  json,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "../utils";
import { user } from "./auth";
import {
  socialPlatformEnum,
  connectionMethodEnum,
  socialAccountStatusEnum,
  oauthFlowStatusEnum,
  credentialKindEnum,
} from "./enums";

// ──────────────────────────────────────────────
// workspace
// ──────────────────────────────────────────────
export const workspace = pgTable("workspace", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const workspaceRelations = relations(workspace, ({ many }) => ({
  members: many(workspaceMember),
  invites: many(invite),
  credentials: many(credential),
  accounts: many(socialAccount),
  posts: many(post),
  queues: many(queue),
  profiles: many(profile),
  apiKeys: many(apiKey),
  oauthFlows: many(oauthFlow),
  mediaAssets: many(mediaAsset),
}));

// ──────────────────────────────────────────────
// workspace_member
// ──────────────────────────────────────────────
export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("MEMBER"), // OWNER, ADMIN, MEMBER
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("workspace_member_workspace_user_idx").on(t.workspaceId, t.userId)]
);

export const workspaceMemberRelations = relations(workspaceMember, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceMember.workspaceId],
    references: [workspace.id],
  }),
  user: one(user, {
    fields: [workspaceMember.userId],
    references: [user.id],
  }),
}));

// ──────────────────────────────────────────────
// invite
// ──────────────────────────────────────────────
export const invite = pgTable("invite", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspaceId")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export const inviteRelations = relations(invite, ({ one }) => ({
  workspace: one(workspace, {
    fields: [invite.workspaceId],
    references: [workspace.id],
  }),
}));

// ──────────────────────────────────────────────
// credential
// ──────────────────────────────────────────────
export const credential = pgTable(
  "credential",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    socialAccountId: text("socialAccountId").references(() => socialAccount.id, {
      onDelete: "cascade",
    }),
    kind: credentialKindEnum("kind"),
    encryptedValue: text("encryptedValue"),
    last4: text("last4"),
    expiresAt: timestamp("expiresAt"),
    type: text("type"), // legacy workspace-scoped credential type
    keyEnc: text("keyEnc"), // legacy encrypted value
    metadata: json("metadata"), // non-sensitive metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("credential_workspace_type_idx").on(t.workspaceId, t.type),
    uniqueIndex("credential_account_kind_idx").on(t.socialAccountId, t.kind),
    index("credential_workspace_account_idx").on(t.workspaceId, t.socialAccountId),
  ]
);

export const credentialRelations = relations(credential, ({ one }) => ({
  workspace: one(workspace, {
    fields: [credential.workspaceId],
    references: [workspace.id],
  }),
  socialAccount: one(socialAccount, {
    fields: [credential.socialAccountId],
    references: [socialAccount.id],
  }),
}));

// ──────────────────────────────────────────────
// profile
// ──────────────────────────────────────────────
export const profile = pgTable("profile", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspaceId")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lateProfileId: text("lateProfileId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const profileRelations = relations(profile, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [profile.workspaceId],
    references: [workspace.id],
  }),
  accounts: many(socialAccount),
  posts: many(post),
  queues: many(queue),
}));

// ──────────────────────────────────────────────
// social_account
// ──────────────────────────────────────────────
export const socialAccount = pgTable(
  "social_account",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    profileId: text("profileId")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    platform: socialPlatformEnum("platform").notNull(),
    connectionMethod: connectionMethodEnum("connectionMethod").notNull(),
    providerIdentifier: text("providerIdentifier").notNull(),
    status: socialAccountStatusEnum("status").notNull().default("CONNECTED"),
    handle: text("handle").notNull(),
    name: text("name"),
    meta: json("meta"),

    // Legacy fields
    platformUserId: text("platformUserId"),
    username: text("username").notNull(),
    displayName: text("displayName"),
    profilePicture: text("profilePicture"),
    isActive: boolean("isActive").notNull().default(true),
    providerType: text("providerType"),

    // Late mode
    lateAccountId: text("lateAccountId"),

    // BYO mode (encrypted tokens)
    accessTokenEnc: text("accessTokenEnc"),
    refreshTokenEnc: text("refreshTokenEnc"),
    tokenExpiresAt: timestamp("tokenExpiresAt"),
    oauthMetadata: json("oauthMetadata"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("social_account_workspace_platform_handle_method_idx").on(
      t.workspaceId,
      t.platform,
      t.handle,
      t.connectionMethod
    ),
    uniqueIndex("social_account_profile_platform_user_idx").on(
      t.profileId,
      t.platform,
      t.platformUserId
    ),
  ]
);

export const socialAccountRelations = relations(socialAccount, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [socialAccount.workspaceId],
    references: [workspace.id],
  }),
  profile: one(profile, {
    fields: [socialAccount.profileId],
    references: [profile.id],
  }),
  credentials: many(credential),
  posts: many(post),
  platformPosts: many(platformPost),
  oauthFlows: many(oauthFlow),
}));

// ──────────────────────────────────────────────
// oauth_flow
// ──────────────────────────────────────────────
export const oauthFlow = pgTable(
  "oauth_flow",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    socialAccountId: text("socialAccountId")
      .notNull()
      .references(() => socialAccount.id, { onDelete: "cascade" }),
    profileId: text("profileId").notNull(),
    platform: socialPlatformEnum("platform").notNull(),
    status: oauthFlowStatusEnum("status").notNull().default("AWAITING_SELECTION"),
    publicCandidates: json("publicCandidates").notNull(),
    contextEnc: text("contextEnc").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    completedAt: timestamp("completedAt"),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("oauth_flow_workspace_status_expires_idx").on(t.workspaceId, t.status, t.expiresAt),
    index("oauth_flow_workspace_account_status_idx").on(
      t.workspaceId,
      t.socialAccountId,
      t.status
    ),
  ]
);

export const oauthFlowRelations = relations(oauthFlow, ({ one }) => ({
  workspace: one(workspace, {
    fields: [oauthFlow.workspaceId],
    references: [workspace.id],
  }),
  socialAccount: one(socialAccount, {
    fields: [oauthFlow.socialAccountId],
    references: [socialAccount.id],
  }),
}));

// ──────────────────────────────────────────────
// post
// ──────────────────────────────────────────────
export const post = pgTable("post", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspaceId")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  profileId: text("profileId")
    .notNull()
    .references(() => profile.id, { onDelete: "cascade" }),
  socialAccountId: text("socialAccountId").references(() => socialAccount.id, {
    onDelete: "set null",
  }),
  content: text("content"),
  status: text("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduledFor"),
  publishedAt: timestamp("publishedAt"),
  timezone: text("timezone"),
  providerType: text("providerType"), // legacy
  latePostId: text("latePostId"),
  queueId: text("queueId").references(() => queue.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const postRelations = relations(post, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [post.workspaceId],
    references: [workspace.id],
  }),
  profile: one(profile, {
    fields: [post.profileId],
    references: [profile.id],
  }),
  socialAccount: one(socialAccount, {
    fields: [post.socialAccountId],
    references: [socialAccount.id],
  }),
  queue: one(queue, {
    fields: [post.queueId],
    references: [queue.id],
  }),
  mediaItems: many(mediaItem),
  platformPosts: many(platformPost),
  cronJob: one(cronJob),
}));

// ──────────────────────────────────────────────
// media_item
// ──────────────────────────────────────────────
export const mediaItem = pgTable("media_item", {
  id: text("id").primaryKey().$defaultFn(createId),
  postId: text("postId")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "image" | "video"
  url: text("url").notNull(),
  key: text("key"),
  provider: text("provider"),
  filename: text("filename"),
  contentType: text("contentType"),
  width: integer("width"),
  height: integer("height"),
  size: integer("size"),
  duration: integer("duration"),
});

export const mediaItemRelations = relations(mediaItem, ({ one }) => ({
  post: one(post, {
    fields: [mediaItem.postId],
    references: [post.id],
  }),
}));

// ──────────────────────────────────────────────
// platform_post
// ──────────────────────────────────────────────
export const platformPost = pgTable("platform_post", {
  id: text("id").primaryKey().$defaultFn(createId),
  postId: text("postId")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  accountId: text("accountId")
    .notNull()
    .references(() => socialAccount.id),
  platform: text("platform").notNull(),
  providerIdentifier: text("providerIdentifier").notNull(),
  status: text("status").notNull().default("pending"),
  platformPostId: text("platformPostId"),
  platformPostUrl: text("platformPostUrl"),
  errorMessage: text("errorMessage"),
  customContent: text("customContent"),
  platformData: json("platformData"),
  publishedAt: timestamp("publishedAt"),
});

export const platformPostRelations = relations(platformPost, ({ one }) => ({
  post: one(post, {
    fields: [platformPost.postId],
    references: [post.id],
  }),
  account: one(socialAccount, {
    fields: [platformPost.accountId],
    references: [socialAccount.id],
  }),
}));

// ──────────────────────────────────────────────
// queue
// ──────────────────────────────────────────────
export const queue = pgTable("queue", {
  id: text("id").primaryKey().$defaultFn(createId),
  profileId: text("profileId")
    .notNull()
    .references(() => profile.id, { onDelete: "cascade" }),
  workspaceId: text("workspaceId")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  active: boolean("active").notNull().default(true),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const queueRelations = relations(queue, ({ one, many }) => ({
  profile: one(profile, {
    fields: [queue.profileId],
    references: [profile.id],
  }),
  workspace: one(workspace, {
    fields: [queue.workspaceId],
    references: [workspace.id],
  }),
  slots: many(queueSlot),
  posts: many(post),
}));

// ──────────────────────────────────────────────
// queue_slot
// ──────────────────────────────────────────────
export const queueSlot = pgTable("queue_slot", {
  id: text("id").primaryKey().$defaultFn(createId),
  queueId: text("queueId")
    .notNull()
    .references(() => queue.id, { onDelete: "cascade" }),
  dayOfWeek: integer("dayOfWeek").notNull(), // 0-6, Sunday = 0
  time: text("time").notNull(), // "HH:mm" format
});

export const queueSlotRelations = relations(queueSlot, ({ one }) => ({
  queue: one(queue, {
    fields: [queueSlot.queueId],
    references: [queue.id],
  }),
}));

// ──────────────────────────────────────────────
// cron_job
// ──────────────────────────────────────────────
export const cronJob = pgTable(
  "cron_job",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    postId: text("postId")
      .notNull()
      .unique()
      .references(() => post.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduledAt").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("maxAttempts").notNull().default(3),
    lastError: text("lastError"),
    lockedAt: timestamp("lockedAt"),
    lockedBy: text("lockedBy"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [index("cron_job_status_scheduled_idx").on(t.status, t.scheduledAt)]
);

export const cronJobRelations = relations(cronJob, ({ one }) => ({
  post: one(post, {
    fields: [cronJob.postId],
    references: [post.id],
  }),
}));

// ──────────────────────────────────────────────
// media_asset
// ──────────────────────────────────────────────
export const mediaAsset = pgTable(
  "media_asset",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    url: text("url").notNull(),
    key: text("key"),
    provider: text("provider"),
    filename: text("filename"),
    contentType: text("contentType"),
    width: integer("width"),
    height: integer("height"),
    size: integer("size"),
    duration: integer("duration"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [index("media_asset_workspace_created_idx").on(t.workspaceId, t.createdAt)]
);

export const mediaAssetRelations = relations(mediaAsset, ({ one }) => ({
  workspace: one(workspace, {
    fields: [mediaAsset.workspaceId],
    references: [workspace.id],
  }),
}));

// ──────────────────────────────────────────────
// api_key
// ──────────────────────────────────────────────
export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("keyHash").notNull().unique(),
    lastUsedAt: timestamp("lastUsedAt"),
    expiresAt: timestamp("expiresAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("api_key_prefix_idx").on(t.prefix)]
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  workspace: one(workspace, {
    fields: [apiKey.workspaceId],
    references: [workspace.id],
  }),
}));
