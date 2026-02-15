import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PUBLISH_BATCH_SIZE } from "@/lib/posts/publish-runner";

test("publish runner should keep a safe default batch size", () => {
  assert.equal(DEFAULT_PUBLISH_BATCH_SIZE, 10);
});
