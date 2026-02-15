import test from "node:test";
import assert from "node:assert/strict";
import {
  getProviderCatalogEntry,
  listProviderCatalogEntries,
  toProviderIdentifier,
} from "@/lib/providers/catalog";

test("catalog should resolve canonical identifiers", () => {
  const identifier = toProviderIdentifier("BYO_OAUTH", "instagram");
  const entry = getProviderCatalogEntry(identifier);

  assert.ok(entry);
  assert.equal(entry?.identifier, identifier);
  assert.equal(entry?.platform, "instagram");
});

test("active catalog should not be empty", () => {
  const active = listProviderCatalogEntries({ status: "active" });
  assert.ok(active.length > 0);
});
