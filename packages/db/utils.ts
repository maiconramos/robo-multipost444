/**
 * Utility to generate cuid-compatible IDs.
 *
 * Uses a simple random ID generator that produces cuid-like strings.
 * Compatible with existing Prisma @default(cuid()) values.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function createId(): string {
  const timestamp = Date.now().toString(36);
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `c${timestamp}${random}`;
}
