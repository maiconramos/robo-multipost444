import { randomUUID } from "crypto";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildUploadPathname(params: {
  workspaceId: string;
  filename: string;
  folder?: "posts" | "thumbnails" | "library";
}): string {
  const folder = params.folder || "posts";

  return [
    params.workspaceId,
    folder,
    `${Date.now()}-${randomUUID()}-${sanitizeFilename(params.filename)}`,
  ].join("/");
}
