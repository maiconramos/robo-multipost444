/**
 * AES-256-GCM encryption using the WebCrypto API.
 *
 * Designed for Cloudflare Workers (and any runtime with `crypto.subtle`).
 * Wire format is backward-compatible with the Node.js implementation in
 * `apps/web/src/lib/encryption.ts`:
 *
 *   iv:ciphertext:authTag   (all hex-encoded)
 *
 * - IV:       12 bytes (96-bit, recommended for GCM)
 * - Auth tag: 16 bytes (128-bit)
 * - Key:      32 bytes derived from a 64-character hex string
 */

const IV_LENGTH = 12; // bytes
const TAG_LENGTH = 16; // bytes
const TAG_BIT_LENGTH = TAG_LENGTH * 8; // 128

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

/** Convert a hex string to a Uint8Array. */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("hexToBytes: input length must be even");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Convert a Uint8Array to a lowercase hex string. */
function bytesToHex(bytes: Uint8Array): string {
  const hexChars: string[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hexChars[i] = bytes[i].toString(16).padStart(2, "0");
  }
  return hexChars.join("");
}

// ---------------------------------------------------------------------------
// Key import
// ---------------------------------------------------------------------------

/**
 * Import a 64-character hex string as a CryptoKey suitable for AES-256-GCM.
 */
async function importKey(keyHex: string): Promise<CryptoKey> {
  if (keyHex.length !== 64) {
    throw new Error(
      `Encryption key must be a 64-character hex string. Got ${keyHex.length} characters.`
    );
  }

  const rawKey = hexToBytes(keyHex);

  return crypto.subtle.importKey(
    "raw",
    rawKey as BufferSource,
    { name: "AES-GCM" },
    false, // not extractable
    ["encrypt", "decrypt"]
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string using AES-256-GCM (WebCrypto).
 *
 * Returns a hex-encoded string in the format: `iv:ciphertext:authTag`
 *
 * @param plaintext - The string to encrypt (e.g., API key, OAuth token)
 * @param keyHex    - 64-character hex string representing the 32-byte key
 * @returns Encrypted string safe for database storage
 */
export async function encrypt(
  plaintext: string,
  keyHex: string
): Promise<string> {
  const key = await importKey(keyHex);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  // WebCrypto appends the auth tag to the ciphertext buffer.
  // Cast iv and encoded to BufferSource to satisfy strict TS checks
  // (Uint8Array's buffer can be SharedArrayBuffer in TS's type system).
  const ciphertextWithTag = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: TAG_BIT_LENGTH },
      key,
      encoded as BufferSource
    )
  );

  // Split: everything except the last TAG_LENGTH bytes is ciphertext,
  // the last TAG_LENGTH bytes is the auth tag.
  const ciphertext = ciphertextWithTag.slice(0, -TAG_LENGTH);
  const authTag = ciphertextWithTag.slice(-TAG_LENGTH);

  return `${bytesToHex(iv)}:${bytesToHex(ciphertext)}:${bytesToHex(authTag)}`;
}

/**
 * Decrypt a string that was encrypted with `encrypt()` (or with the
 * Node.js implementation that uses the same wire format).
 *
 * @param encryptedValue - The encrypted string in format `iv:ciphertext:authTag`
 * @param keyHex         - 64-character hex string representing the 32-byte key
 * @returns The original plaintext string
 * @throws If the value is malformed or the key/tag is wrong
 */
export async function decrypt(
  encryptedValue: string,
  keyHex: string
): Promise<string> {
  const parts = encryptedValue.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted value format. Expected iv:ciphertext:authTag"
    );
  }

  const [ivHex, ciphertextHex, authTagHex] = parts;

  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);
  const authTag = hexToBytes(authTagHex);

  if (iv.length !== IV_LENGTH) {
    throw new Error(
      `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`
    );
  }

  if (authTag.length !== TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length: expected ${TAG_LENGTH}, got ${authTag.length}`
    );
  }

  const key = await importKey(keyHex);

  // WebCrypto expects ciphertext + authTag concatenated
  const ciphertextWithTag = new Uint8Array(ciphertext.length + authTag.length);
  ciphertextWithTag.set(ciphertext, 0);
  ciphertextWithTag.set(authTag, ciphertext.length);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource, tagLength: TAG_BIT_LENGTH },
    key,
    ciphertextWithTag as BufferSource
  );

  return new TextDecoder().decode(decryptedBuffer);
}
