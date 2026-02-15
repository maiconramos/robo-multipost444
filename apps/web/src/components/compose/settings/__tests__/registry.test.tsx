import test from "node:test";
import assert from "node:assert/strict";
import { getSettingsProviderComponent } from "@/components/compose/settings/registry";
import { toProviderIdentifier } from "@/lib/providers/catalog";

test("settings registry should resolve instagram settings by provider identifier", () => {
  const component = getSettingsProviderComponent(
    toProviderIdentifier("BYO_OAUTH", "instagram"),
    "instagram",
  );

  assert.equal(typeof component, "function");
});
