import test from "node:test";
import assert from "node:assert/strict";

import { readOfflineCache, writeOfflineCache } from "../lib/offline-cache.ts";

test("offline cache returns fallback outside the browser", () => {
  assert.deepEqual(readOfflineCache("missing", [] as string[]), []);
});

test("offline cache write is a no-op outside the browser", () => {
  assert.doesNotThrow(() => writeOfflineCache("sample", { ok: true }));
});
