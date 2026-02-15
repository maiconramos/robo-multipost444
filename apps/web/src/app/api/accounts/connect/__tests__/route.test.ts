import test from "node:test";
import assert from "node:assert/strict";
import { resolveProviderFromPayload } from "@/lib/providers/catalog/account-provider";

test("connect flow should resolve oauth-capable providers", () => {
  const provider = resolveProviderFromPayload({
    providerIdentifier: "byo_oauth.instagram",
    onlyActive: true,
  });

  assert.ok(provider);
  assert.equal(provider?.connectMode, "oauth");
});
