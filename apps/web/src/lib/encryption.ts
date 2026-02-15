import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag
const ENCODING = "hex" as const;

/**
 * Get the 32-byte encryption key from the ENCRYPTION_KEY env var.
 * The env var must be a 64-character hex string (32 bytes).
 */
import { getEncryptionKey } from "./secrets";

/**
 * Get the 32-byte encryption key.
 * Uses the environment variable if set, otherwise uses the derived stable key.
 */
function getKey(): Buffer {
  const hex = getEncryptionKey();

  // Debug logging
  console.log(`DEBUG: Using encryption key (length: ${hex.length})`);

  if (hex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string. Got ${hex.length} characters.`
    );
  }
  return Buffer.from(hex, ENCODING);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns a hex-encoded string in the format: iv:ciphertext:authTag
 *
 * @param plaintext - The string to encrypt (e.g., API key, OAuth token)
 * @returns Encrypted string safe for database storage
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", ENCODING);
  encrypted += cipher.final(ENCODING);

  const authTag = cipher.getAuthTag();

  // Format: iv:ciphertext:authTag (all hex-encoded)
  return `${iv.toString(ENCODING)}:${encrypted}:${authTag.toString(ENCODING)}`;
}

/**
 * Decrypt a string that was encrypted with `encrypt()`.
 *
 * @param encryptedValue - The encrypted string in format iv:ciphertext:authTag
 * @returns The original plaintext string
 * @throws If the value is malformed or the key/tag is wrong
 */
export function decrypt(encryptedValue: string): string {
  const key = getKey();
  const parts = encryptedValue.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted value format. Expected iv:ciphertext:authTag"
    );
  }

  const [ivHex, ciphertextHex, authTagHex] = parts;

  const iv = Buffer.from(ivHex, ENCODING);
  const authTag = Buffer.from(authTagHex, ENCODING);

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (authTag.length !== TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length: expected ${TAG_LENGTH}, got ${authTag.length}`
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, ENCODING, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
