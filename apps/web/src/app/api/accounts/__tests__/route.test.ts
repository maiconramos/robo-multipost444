import test from "node:test";
import assert from "node:assert/strict";
import { resolveProviderFromPayload } from "@/lib/providers/catalog/account-provider";

test("accounts payload should resolve active provider identifiers", () => {
  const provider = resolveProviderFromPayload({
    providerIdentifier: "byo_oauth.instagram",
    onlyActive: true,
  });

  assert.ok(provider);
  assert.equal(provider?.identifier, "byo_oauth.instagram");
});
