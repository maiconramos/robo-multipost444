import test from "node:test";
import assert from "node:assert/strict";
import { listProviderCatalogEntries } from "@/lib/providers/catalog";
import {
  getProviderRuntimeEntry,
  listProviderRuntimeEntries,
} from "@/lib/providers/runtime/registry";

test("every active catalog entry should resolve runtime or be marked coming soon", () => {
  const activeEntries = listProviderCatalogEntries({ status: "active" });
  const runtimes = listProviderRuntimeEntries();

  assert.ok(runtimes.length > 0);

  const missing = activeEntries.filter((entry) => !getProviderRuntimeEntry(entry.identifier));
  assert.equal(missing.length, 0, `Missing runtime entries: ${missing.map((entry) => entry.identifier).join(", ")}`);
});
