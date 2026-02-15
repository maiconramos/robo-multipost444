import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Generate a new API key with prefix and hash.
 * The raw key is returned only once — only the hash is stored.
 */
export function generateApiKey(): {
  key: string;
  prefix: string;
  keyHash: string;
} {
  const key = `rmk_${crypto.randomBytes(32).toString("hex").slice(0, 32)}`;
  const prefix = key.slice(0, 12);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, prefix, keyHash };
}

/**
 * Validate an API key against the database.
 * Returns the workspace ID if valid, null otherwise.
 */
export async function validateApiKey(
  key: string
): Promise<{ workspaceId: string } | null> {
  if (!key.startsWith("rmk_") || key.length !== 36) {
    return null;
  }

  const prefix = key.slice(0, 12);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      prefix,
      keyHash,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!apiKey) return null;

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { workspaceId: apiKey.workspaceId };
}

/**
 * Revoke an API key (soft-delete by setting revokedAt).
 */
export async function revokeApiKey(
  id: string,
  workspaceId: string
): Promise<void> {
  await prisma.apiKey.update({
    where: { id, workspaceId },
    data: { revokedAt: new Date() },
  });
}
