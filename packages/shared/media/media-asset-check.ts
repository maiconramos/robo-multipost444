type MediaReference = {
  type: "image" | "video";
  url: string;
  key?: string | null;
  provider?: string | null;
  contentType?: string | null;
};

type CheckedAsset = {
  contentType: string;
  contentLength?: number;
};

function normalizeMimeType(value: string | null | undefined): string {
  if (!value) return "";
  return value.split(";")[0]?.trim().toLowerCase() || "";
}

function parseContentLength(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function isContentTypeCompatible(params: {
  declaredType: "image" | "video";
  actualContentType: string;
  declaredContentType?: string | null;
}): boolean {
  const normalizedActual = normalizeMimeType(params.actualContentType);
  if (!normalizedActual) return false;
  if (params.declaredType === "image" && !normalizedActual.startsWith("image/")) return false;
  if (params.declaredType === "video" && !normalizedActual.startsWith("video/")) return false;
  const declared = normalizeMimeType(params.declaredContentType);
  if (declared && declared !== normalizedActual) return false;
  return true;
}

async function inspectByFetch(url: string): Promise<CheckedAsset> {
  const headResponse = await fetch(url, {
    method: "HEAD",
  });

  if (headResponse.ok) {
    return {
      contentType: normalizeMimeType(headResponse.headers.get("content-type")),
      contentLength: parseContentLength(headResponse.headers.get("content-length")),
    };
  }

  const rangeResponse = await fetch(url, {
    method: "GET",
    headers: { Range: "bytes=0-1023" },
  });

  if (!rangeResponse.ok) {
    throw new Error(`Media URL is not accessible (HTTP ${rangeResponse.status}).`);
  }

  return {
    contentType: normalizeMimeType(rangeResponse.headers.get("content-type")),
    contentLength: parseContentLength(rangeResponse.headers.get("content-length")),
  };
}

export type { MediaReference, CheckedAsset };

export async function validateMediaAssetForPublishing(media: MediaReference): Promise<void> {
  const checked = await inspectByFetch(media.url);

  if (!checked.contentType) {
    throw new Error("Media URL is missing a valid content-type header.");
  }

  if (!isContentTypeCompatible({
    declaredType: media.type,
    declaredContentType: media.contentType,
    actualContentType: checked.contentType,
  })) {
    throw new Error(
      `Media content-type mismatch. Expected ${media.type} and received ${checked.contentType || "unknown"}.`
    );
  }

  if (!checked.contentLength || checked.contentLength <= 0) {
    throw new Error("Media asset is empty or has invalid size.");
  }
}

export async function validatePostMediaAssetsForPublishing(mediaItems: MediaReference[]): Promise<void> {
  for (const media of mediaItems) {
    await validateMediaAssetForPublishing(media);
  }
}
