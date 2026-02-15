export type AIImageStyle =
  | "realistic"
  | "cartoon"
  | "minimalist"
  | "artistic"
  | "photographic";

export type AIAspectRatio = "1:1" | "4:5" | "16:9" | "9:16";

export interface GenerateTextOptions {
  prompt: string;
  context?: string;
  platform?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface GenerateTextResult {
  text: string;
  model: string;
  tokensUsed: number;
}

export interface GenerateImageOptions {
  prompt: string;
  style?: AIImageStyle;
  aspectRatio?: AIAspectRatio;
  size?: string;
  model?: string;
}

export interface GenerateImageResult {
  imageUrl: string;
  revisedPrompt?: string;
  model: string;
}

export interface AIProvider {
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
  generateImage(options: GenerateImageOptions): Promise<GenerateImageResult>;
  isAvailable(): boolean;
}

export interface AIProviderConfig {
  provider: "openrouter";
  textModel: string;
  imageModel: string;
}

export interface AIAvailability {
  available: boolean;
  provider: "openrouter" | "none";
  textModel?: string;
  imageModel?: string;
  reason?: string;
}

export const DEFAULT_AI_TEXT_MODEL = "openai/gpt-4o-mini";
export const DEFAULT_AI_IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

export const AI_TEXT_MODEL_OPTIONS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
] as const;

export const AI_IMAGE_MODEL_OPTIONS = [
  "google/gemini-2.5-flash-image-preview",
  "black-forest-labs/flux.1-schnell",
  "openai/dall-e-3",
  "stabilityai/stable-diffusion-xl",
] as const;

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
