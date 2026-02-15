import { NextResponse } from "next/server";
import { getCronSecret } from "@/lib/secrets";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
        cronSecret: getCronSecret(),
    });
}
