/**
 * Database fixture helpers for E2E tests.
 *
 * Uses Prisma client directly to seed and clean the test database.
 * Each helper is idempotent — safe to call multiple times.
 */

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

/** Get a shared Prisma client for test operations */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ["warn", "error"],
    });
  }
  return prisma;
}

/** Disconnect the Prisma client (call in teardown) */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Clean all application data from the database.
 * Preserves the schema but removes all rows.
 * Order respects FK constraints (children first).
 */
export async function cleanDatabase(): Promise<void> {
  const db = getPrisma();

  // Delete in reverse dependency order
  await db.$transaction([
    db.cronJob.deleteMany(),
    db.platformPost.deleteMany(),
    db.mediaItem.deleteMany(),
    db.post.deleteMany(),
    db.queueSlot.deleteMany(),
    db.queue.deleteMany(),
    db.oAuthFlow.deleteMany(),
    db.credential.deleteMany(),
    db.socialAccount.deleteMany(),
    db.profile.deleteMany(),
    db.mediaAsset.deleteMany(),
    db.apiKey.deleteMany(),
    db.invite.deleteMany(),
    db.workspaceMember.deleteMany(),
    db.workspace.deleteMany(),
    // Better Auth tables
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.verification.deleteMany(),
    db.user.deleteMany(),
  ]);
}

/**
 * Create a test workspace with a user as OWNER.
 * Returns workspace and member IDs.
 */
export async function createTestWorkspace(params: {
  userId: string;
  name?: string;
  slug?: string;
}): Promise<{ workspaceId: string; memberId: string }> {
  const db = getPrisma();
  const workspace = await db.workspace.create({
    data: {
      name: params.name || "Test Workspace",
      slug: params.slug || `test-ws-${Date.now()}`,
      members: {
        create: {
          userId: params.userId,
          role: "OWNER",
        },
      },
    },
    include: { members: true },
  });

  return {
    workspaceId: workspace.id,
    memberId: workspace.members[0].id,
  };
}

/**
 * Create a test profile within a workspace.
 */
export async function createTestProfile(params: {
  workspaceId: string;
  name?: string;
}): Promise<string> {
  const db = getPrisma();
  const profile = await db.profile.create({
    data: {
      workspaceId: params.workspaceId,
      name: params.name || "Test Profile",
    },
  });
  return profile.id;
}

/**
 * Create a test social account connected to a profile.
 */
export async function createTestSocialAccount(params: {
  workspaceId: string;
  profileId: string;
  platform?: "INSTAGRAM" | "FACEBOOK" | "THREADS" | "TIKTOK";
  connectionMethod?: "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE";
  handle?: string;
}): Promise<string> {
  const db = getPrisma();
  const platform = params.platform || "INSTAGRAM";
  const method = params.connectionMethod || "BYO_OAUTH";
  const providerIdentifier = `${method.toLowerCase()}.${platform.toLowerCase()}`;
  const account = await db.socialAccount.create({
    data: {
      workspaceId: params.workspaceId,
      profileId: params.profileId,
      platform,
      connectionMethod: method,
      providerIdentifier,
      handle: params.handle || `@test-${Date.now()}`,
      username: `testuser-${Date.now()}`,
      displayName: "Test Social Account",
      status: "CONNECTED",
    },
  });
  return account.id;
}

/**
 * Create a test post (draft).
 */
export async function createTestPost(params: {
  workspaceId: string;
  profileId: string;
  socialAccountId?: string;
  content?: string;
  status?: string;
  scheduledFor?: Date;
}): Promise<string> {
  const db = getPrisma();
  const post = await db.post.create({
    data: {
      workspaceId: params.workspaceId,
      profileId: params.profileId,
      socialAccountId: params.socialAccountId,
      content: params.content || "Test post content from E2E fixture",
      status: params.status || "draft",
      scheduledFor: params.scheduledFor,
    },
  });
  return post.id;
}

/**
 * Create a test queue with slots.
 */
export async function createTestQueue(params: {
  workspaceId: string;
  profileId: string;
  name?: string;
  timezone?: string;
  slots?: Array<{ dayOfWeek: number; time: string }>;
}): Promise<string> {
  const db = getPrisma();
  const queue = await db.queue.create({
    data: {
      workspaceId: params.workspaceId,
      profileId: params.profileId,
      name: params.name || "Test Queue",
      timezone: params.timezone || "America/Sao_Paulo",
      active: true,
      slots: {
        create: (params.slots || [
          { dayOfWeek: 1, time: "09:00" },
          { dayOfWeek: 3, time: "14:00" },
        ]).map((s) => ({
          dayOfWeek: s.dayOfWeek,
          time: s.time,
        })),
      },
    },
  });
  return queue.id;
}

/**
 * Create a test media asset in the library.
 */
export async function createTestMediaAsset(params: {
  workspaceId: string;
  type?: "image" | "video";
  url?: string;
  filename?: string;
  size?: number;
}): Promise<string> {
  const db = getPrisma();
  const asset = await db.mediaAsset.create({
    data: {
      workspaceId: params.workspaceId,
      type: params.type || "image",
      url: params.url || `https://mock-blob.vercel-storage.com/test-${Date.now()}.jpg`,
      key: `test-${Date.now()}.jpg`,
      provider: "VERCEL_BLOB",
      filename: params.filename || "test-image.jpg",
      contentType: params.type === "video" ? "video/mp4" : "image/jpeg",
      size: params.size || 1024,
    },
  });
  return asset.id;
}

/**
 * Create an invite for a workspace.
 */
export async function createTestInvite(params: {
  workspaceId: string;
  email: string;
}): Promise<{ inviteId: string; token: string }> {
  const db = getPrisma();
  const token = `test-invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const invite = await db.invite.create({
    data: {
      workspaceId: params.workspaceId,
      email: params.email,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });
  return { inviteId: invite.id, token };
}
