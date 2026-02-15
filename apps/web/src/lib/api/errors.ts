import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown, context: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (error instanceof Error && error.message === "NO_WORKSPACE") {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }

  if (error instanceof Error && error.message === "NOT_FOUND") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: error.issues,
      },
      { status: 400 }
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.error(context, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
