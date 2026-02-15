import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { getAIProvider } from "@/lib/ai";
import { AIProviderError } from "@/lib/ai/types";
import { handleApiError } from "@/lib/api/errors";

const imageStyleSchema = z.enum([
  "realistic",
  "cartoon",
  "minimalist",
  "artistic",
  "photographic",
]);

const aspectRatioSchema = z.enum(["1:1", "4:5", "16:9", "9:16"]);

const generateImageSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  style: imageStyleSchema.optional(),
  aspectRatio: aspectRatioSchema.optional(),
  size: z.string().trim().max(40).optional(),
  model: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json().catch(() => ({}));
    const parsed = generateImageSchema.parse(body);

    const provider = await getAIProvider(workspace.id);
    if (!provider || !provider.isAvailable()) {
      return NextResponse.json(
        { error: "AI is not configured for this workspace" },
        { status: 400 },
      );
    }

    const result = await provider.generateImage(parsed);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return handleApiError(error, "POST /api/ai/generate-image error");
  }
}
