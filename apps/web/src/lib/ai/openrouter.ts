import {
  AIProviderError,
  type AIProvider,
  type GenerateImageOptions,
  type GenerateImageResult,
  type GenerateTextOptions,
  type GenerateTextResult,
} from "@/lib/ai/types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const REQUEST_TIMEOUT_MS = 60_000;

interface OpenRouterErrorPayload {
  error?: {
    message?: string;
  };
  message?: string;
}

interface OpenRouterChatMessageImage {
  image_url?: {
    url?: string;
  };
  url?: string;
}

interface OpenRouterChatMessage {
  content?: unknown;
  images?: OpenRouterChatMessageImage[];
  revised_prompt?: string;
}

interface OpenRouterChatResponse {
  model?: string;
  usage?: {
    total_tokens?: number;
  };
  choices?: Array<{
    message?: OpenRouterChatMessage;
  }>;
}

export interface OpenRouterProviderOptions {
  apiKey: string;
  textModel: string;
  imageModel: string;
  appUrl?: string;
}

export class OpenRouterProvider implements AIProvider {
  constructor(private readonly options: OpenRouterProviderOptions) {}

  isAvailable(): boolean {
    return this.options.apiKey.trim().length > 0;
  }

  async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    if (!this.isAvailable()) {
      throw new AIProviderError("AI provider is not configured", 400);
    }

    const selectedModel = options.model || this.options.textModel;
    const response = await this.requestJson<OpenRouterChatResponse>(
      "/chat/completions",
      {
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: this.buildTextSystemPrompt(options.platform),
          },
          {
            role: "user",
            content: this.buildTextUserPrompt(options),
          },
        ],
        max_tokens: options.maxTokens ?? 500,
        temperature: options.temperature ?? 0.7,
      },
    );

    const message = response.choices?.[0]?.message;
    const text = extractTextContent(message?.content);
    if (!text) {
      throw new AIProviderError("AI did not return text content", 502);
    }

    return {
      text,
      model: response.model || selectedModel,
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }

  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
    if (!this.isAvailable()) {
      throw new AIProviderError("AI provider is not configured", 400);
    }

    const selectedModel = options.model || this.options.imageModel;
    const prompt = this.buildImagePrompt(options);

    const requestBody: Record<string, unknown> = {
      model: selectedModel,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    };

    if (options.aspectRatio) {
      requestBody.image_config = {
        aspect_ratio: options.aspectRatio,
      };
    }

    const response = await this.requestJson<OpenRouterChatResponse>(
      "/chat/completions",
      requestBody,
    );

    const message = response.choices?.[0]?.message;
    const imageUrl = extractImageUrl(message);
    if (!imageUrl) {
      throw new AIProviderError("AI did not return an image", 502);
    }

    return {
      imageUrl,
      revisedPrompt: extractTextContent(message?.content),
      model: response.model || selectedModel,
    };
  }

  private buildTextSystemPrompt(platform?: string): string {
    if (platform) {
      return `You are a social media content expert. Generate engaging copy optimized for ${platform}.`;
    }

    return "You are a social media content expert. Generate concise and engaging copy with clear calls-to-action.";
  }

  private buildTextUserPrompt(options: GenerateTextOptions): string {
    const chunks = [options.prompt.trim()];

    if (options.context?.trim()) {
      chunks.push(`\n\nExisting content:\n${options.context.trim()}`);
    }

    if (options.platform?.trim()) {
      chunks.push(`\n\nPlatform: ${options.platform.trim()}`);
    }

    return chunks.join("");
  }

  private buildImagePrompt(options: GenerateImageOptions): string {
    const chunks = [options.prompt.trim()];

    if (options.style) {
      chunks.push(`Style: ${options.style}.`);
    }

    if (options.size) {
      chunks.push(`Target size: ${options.size}.`);
    }

    return chunks.join("\n");
  }

  private async requestJson<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Robo MultiPost",
          ...(this.options.appUrl
            ? {
                "HTTP-Referer": this.options.appUrl,
              }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload =
        (await response.json().catch(() => ({}))) as
          | T
          | OpenRouterErrorPayload;

      if (!response.ok) {
        const message = this.buildErrorMessage(response.status, payload);
        throw new AIProviderError(message, response.status);
      }

      return payload as T;
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderError("AI request timed out after 60 seconds", 504);
      }

      const message =
        error instanceof Error ? error.message : "Unexpected AI request error";
      throw new AIProviderError(message, 500);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildErrorMessage(status: number, payload: unknown): string {
    const providerMessage = extractProviderErrorMessage(payload);

    if (status === 401) {
      return providerMessage || "Invalid OpenRouter API key";
    }

    if (status === 402) {
      return providerMessage || "OpenRouter account has no available credits";
    }

    if (status === 403) {
      return providerMessage || "OpenRouter request was not authorized";
    }

    if (status === 404) {
      return providerMessage || "Configured AI model was not found";
    }

    if (status === 429) {
      return providerMessage || "OpenRouter rate limit reached. Try again soon";
    }

    return providerMessage || "OpenRouter request failed";
  }
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const textParts = content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (!item || typeof item !== "object") {
        return "";
      }

      const itemRecord = item as Record<string, unknown>;
      if (typeof itemRecord.text === "string") {
        return itemRecord.text;
      }

      const nestedText = itemRecord.content;
      if (typeof nestedText === "string") {
        return nestedText;
      }

      return "";
    })
    .filter(Boolean);

  return textParts.join("\n").trim();
}

function extractImageUrl(message?: OpenRouterChatMessage): string | undefined {
  const image = message?.images?.find((entry) => {
    return Boolean(entry.image_url?.url || entry.url);
  });

  const directUrl = image?.image_url?.url || image?.url;
  if (directUrl) {
    return directUrl;
  }

  const content = extractTextContent(message?.content);
  if (!content) {
    return undefined;
  }

  const markdownMatch = content.match(/\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+|https?:\/\/[^)]+)\)/);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  const rawMatch = content.match(/(data:image\/[a-zA-Z0-9.+-]+;base64,[^\s]+|https?:\/\/\S+)/);
  if (rawMatch?.[1]) {
    return rawMatch[1];
  }

  return undefined;
}

function extractProviderErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  const error = data.error;
  if (error && typeof error === "object") {
    const errorMessage = (error as Record<string, unknown>).message;
    if (typeof errorMessage === "string" && errorMessage.trim()) {
      return errorMessage.trim();
    }
  }

  return undefined;
}
