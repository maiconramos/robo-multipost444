/**
 * @robo/shared — Shared business logic
 *
 * Contains platform-agnostic code used by both the Worker API and the Web frontend:
 * - crypto/     AES-256-GCM encryption (WebCrypto compatible)
 * - types/      Platform definitions, colors, constraints
 * - providers/  Provider catalog (entries, resolution, types)
 * - posts/      Platform settings schema, selection, scheduling, serializers
 * - social-accounts  Platform ↔ SocialPlatform mapping utilities
 */

// Fase 3 — Crypto utilities (AES-256-GCM, WebCrypto-based)
export * from "./crypto";

// Fase 4 — Types
export * from "./types/platforms";

// Fase 4 — Social account utilities
export * from "./social-accounts";

// Fase 4 — Provider catalog
export * from "./providers/catalog";
export * from "./providers/catalog/types";

// Fase 4 — Posts
export * from "./posts/platform-settings-schema";
export * from "./posts/platform-selection";
export * from "./posts/scheduling";
export * from "./posts/queue-scheduler";
export * from "./posts/serializers";

// Fase 5 — Storage types and utilities
export * from "./storage";

// Fase 5 — Media types and validation
export * from "./media";
export * from "./media/media-asset-check";
