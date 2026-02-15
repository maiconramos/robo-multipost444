import Late from "@getlatedev/node";

// Create a Late client instance using an explicit per-account API key.
export function createLateClient(apiKey: string): Late {
  const key = apiKey?.trim();
  if (!key) {
    throw new Error("Late API key is required.");
  }

  return new Late({
    apiKey: key,
  });
}

// Optional singleton helper for long-lived server tasks with explicit key.
let serverClient: Late | null = null;
let serverClientKey: string | null = null;

export function getServerClient(apiKey: string): Late {
  if (!serverClient || serverClientKey !== apiKey) {
    serverClient = createLateClient(apiKey);
    serverClientKey = apiKey;
  }
  return serverClient;
}
