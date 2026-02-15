/**
 * Utilitário para obter ou gerar segredos do sistema de forma estável.
 * Implementação SHA-256 em JS puro para compatibilidade com Edge Runtime (Vercel Middleware).
 */

function sha256(ascii: string): string {
    function rightRotate(value: number, amount: number) {
        return (value >>> amount) | (value << (32 - amount));
    }

    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const result: number[] = [];
    const words: number[] = [];
    const asciiLength = ascii.length;
    const hash = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
        0x1f83d9ab, 0x5be0cd19,
    ];
    const k = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
        0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
        0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
        0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
        0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    let i: number;
    let j: number;
    const wordCount = ((asciiLength + 8) >> 6) + 1;
    const byteCount = wordCount << 6;

    for (i = 0; i < byteCount; i++) {
        words[i >> 2] |= (i < asciiLength ? ascii.charCodeAt(i) : i === asciiLength ? 0x80 : 0) << (24 - (i % 4) * 8);
    }

    words[wordCount * 16 - 1] = asciiLength * 8;

    for (i = 0; i < byteCount; i += 64) {
        const w: number[] = [];
        const h = hash.slice(0);
        for (j = 0; j < 64; j++) {
            if (j < 16) {
                w[j] = words[i / 4 + j];
            } else {
                const s0 = (rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3)) | 0;
                const s1 = (rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10)) | 0;
                w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
            }
            const ch = (h[4] & h[5]) ^ (~h[4] & h[6]);
            const maj = (h[0] & h[1]) ^ (h[0] & h[2]) ^ (h[1] & h[2]);
            const t1 = (h[7] + (rightRotate(h[4], 6) ^ rightRotate(h[4], 11) ^ rightRotate(h[4], 25)) + ch + k[j] + w[j]) | 0;
            const t2 = ((rightRotate(h[0], 2) ^ rightRotate(h[0], 13) ^ rightRotate(h[0], 22)) + maj) | 0;
            h[7] = h[6];
            h[6] = h[5];
            h[5] = h[4];
            h[4] = (h[3] + t1) | 0;
            h[3] = h[2];
            h[2] = h[1];
            h[1] = h[0];
            h[0] = (t1 + t2) | 0;
        }
        for (j = 0; j < 8; j++) {
            hash[j] = (hash[j] + h[j]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j >= 0; j--) {
            const b = (hash[i] >> (j * 8)) & 0xff;
            result.push(b);
        }
    }

    return result.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getSeed(): string {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        if (process.env.NODE_ENV === "development") {
            return "dev-seed-robo-multipost";
        }
        // No Vercel Build (Data Collection), a env pode estar vazia.
        // Usamos uma semente de fallback estável baseada no nome do projeto se possível.
        return process.env.VERCEL_URL || "build-time-seed-fallback";
    }

    try {
        const url = new URL(dbUrl);
        return url.hostname;
    } catch (e) {
        return dbUrl;
    }
}

function deriveSecret(keyName: string, length: number = 32): string {
    const seed = getSeed();
    // Usamos sha256 puro em vez de hmac para simplicidade no Edge
    const hash = sha256(`robo-multipost-v1-${keyName}-${seed}`);
    return hash.slice(0, length);
}

export function getEncryptionKey(): string {
    const envValue = process.env.ENCRYPTION_KEY;
    if (envValue && envValue.length === 64) return envValue;
    return deriveSecret("encryption-key", 64);
}

export function getBetterAuthSecret(): string {
    return process.env.BETTER_AUTH_SECRET || deriveSecret("better-auth-secret", 44);
}

export function getCronSecret(): string {
    return process.env.CRON_SECRET || deriveSecret("cron-secret", 32);
}

export function isValidCronSecret(providedSecret: string | null): boolean {
    if (!providedSecret) return false;
    return providedSecret === getCronSecret();
}

export function getBaseUrl(): string {
    let url = "http://localhost:3000";

    if (process.env.BETTER_AUTH_URL) {
        url = process.env.BETTER_AUTH_URL;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
        url = process.env.NEXT_PUBLIC_APP_URL;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
        url = `https://${process.env.VERCEL_URL}`;
    }

    return url.replace(/\/$/, "");
}
