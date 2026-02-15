import { decrypt } from "@/lib/encryption";
import { OpenRouterProvider } from "@/lib/ai/openrouter";
import {
  DEFAULT_AI_IMAGE_MODEL,
  DEFAULT_AI_TEXT_MODEL,
  type AIAvailability,
  type AIProvider,
  type AIProviderConfig,
} from "@/lib/ai/types";
import { prisma } from "@/lib/prisma";

interface AICredentialMetadata {
  provider?: unknown;
  textModel?: unknown;
  imageModel?: unknown;
}

function getProviderFlag(): "openrouter" | "none" {
  const value = (process.env.AI_PROVIDER || "OPENROUTER").trim().toUpperCase();

  if (!value || value === "OPENROUTER") {
    return "openrouter";
  }

  if (value === "NONE") {
    return "none";
  }

  return "none";
}

export async function getAIProvider(workspaceId: string): Promise<AIProvider | null> {
  const providerFlag = getProviderFlag();
  if (providerFlag === "none") {
    return null;
  }

  const credential = await prisma.credential.findUnique({
    where: {
      workspaceId_type: {
        workspaceId,
        type: "ai_api_key",
      },
    },
    select: {
      keyEnc: true,
      metadata: true,
    },
  });

  if (!credential) {
    return null;
  }

  if (!credential.keyEnc) {
    return null;
  }

  const apiKey = decrypt(credential.keyEnc);
  const config = resolveProviderConfig(credential.metadata);

  return new OpenRouterProvider({
    apiKey,
    textModel: config.textModel,
    imageModel: config.imageModel,
    appUrl: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  });
}

export async function getAIAvailability(workspaceId: string): Promise<AIAvailability> {
  const providerFlag = getProviderFlag();

  if (providerFlag === "none") {
    return {
      available: false,
      provider: "none",
      reason: "AI_PROVIDER is set to NONE",
    };
  }

  const credential = await prisma.credential.findUnique({
    where: {
      workspaceId_type: {
        workspaceId,
        type: "ai_api_key",
      },
    },
    select: {
      id: true,
      metadata: true,
    },
  });

  if (!credential) {
    const fallback = resolveProviderConfig(null);

    return {
      available: false,
      provider: "openrouter",
      textModel: fallback.textModel,
      imageModel: fallback.imageModel,
      reason: "OpenRouter API key not configured",
    };
  }

  const config = resolveProviderConfig(credential.metadata);

  return {
    available: true,
    provider: "openrouter",
    textModel: config.textModel,
    imageModel: config.imageModel,
  };
}

function resolveProviderConfig(metadata: unknown): AIProviderConfig {
  const normalized = isMetadataObject(metadata) ? metadata : ({} as AICredentialMetadata);

  const provider =
    typeof normalized.provider === "string" && normalized.provider.trim().length > 0
      ? normalized.provider.trim().toLowerCase()
      : "openrouter";

  const textModel =
    typeof normalized.textModel === "string" && normalized.textModel.trim().length > 0
      ? normalized.textModel.trim()
      : DEFAULT_AI_TEXT_MODEL;

  const imageModel =
    typeof normalized.imageModel === "string" && normalized.imageModel.trim().length > 0
      ? normalized.imageModel.trim()
      : DEFAULT_AI_IMAGE_MODEL;

  return {
    provider: provider === "openrouter" ? "openrouter" : "openrouter",
    textModel,
    imageModel,
  };
}

function isMetadataObject(value: unknown): value is AICredentialMetadata {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
