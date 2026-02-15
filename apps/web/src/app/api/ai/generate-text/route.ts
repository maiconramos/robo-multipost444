import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { getAIProvider } from "@/lib/ai";
import { AIProviderError } from "@/lib/ai/types";
import { handleApiError } from "@/lib/api/errors";

const generateTextSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  context: z.string().trim().max(10_000).optional(),
  platform: z.string().trim().max(100).optional(),
  maxTokens: z.coerce.number().int().min(32).max(2_000).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  model: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json().catch(() => ({}));
    const parsed = generateTextSchema.parse(body);

    const provider = await getAIProvider(workspace.id);
    if (!provider || !provider.isAvailable()) {
      return NextResponse.json(
        { error: "AI is not configured for this workspace" },
        { status: 400 },
      );
    }

    const result = await provider.generateText(parsed);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return handleApiError(error, "POST /api/ai/generate-text error");
  }
}
