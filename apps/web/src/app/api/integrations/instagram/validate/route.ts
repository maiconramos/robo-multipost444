import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { META_API_VERSION } from "@/lib/providers/meta-config";

const validateBodySchema = z.object({
    token: z.string().min(1),
});

interface FacebookPagesResponse {
    data: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: {
            id: string;
            username: string;
            profile_picture_url?: string;
            name?: string;
        };
    }>;
}

export async function POST(request: NextRequest) {
    try {
        // Ensure user is authenticated and has workspace access
        await getWorkspaceUser(request.headers);

        const body = await request.json();
        const { token } = validateBodySchema.parse(body);

        // Call Facebook Graph API to get Pages and connected IG accounts
        const response = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url,name}&access_token=${token}`
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { error: errorData.error?.message || "Failed to validate token with Facebook" },
                { status: response.status }
            );
        }

        const data = (await response.json()) as FacebookPagesResponse;

        // Filter pages that have an Instagram Business Account connected
        const instagramAccounts = data.data
            .filter((page) => page.instagram_business_account?.id)
            .map((page) => ({
                pageId: page.id,
                pageName: page.name,
                pageAccessToken: page.access_token,
                instagramId: page.instagram_business_account!.id,
                username: page.instagram_business_account!.username,
                name: page.instagram_business_account!.name,
                profilePictureUrl: page.instagram_business_account!.profile_picture_url,
            }));

        return NextResponse.json({ accounts: instagramAccounts });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        console.error("Instagram validation error:", error);
        return NextResponse.json(
            { error: "Internal server error during validation" },
            { status: 500 }
        );
    }
}
