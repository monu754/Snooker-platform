import test from "node:test";
import assert from "node:assert/strict";
import { consumeRateLimit } from "../lib/rate-limit.ts";

test("consumeRateLimit blocks after the configured limit", async () => {
  process.env.RATE_LIMIT_DRIVER = "memory";
  const key = `test:${Date.now()}`;

  const first = await consumeRateLimit({ key, limit: 2, windowMs: 60_000 });
  const second = await consumeRateLimit({ key, limit: 2, windowMs: 60_000 });
  const third = await consumeRateLimit({ key, limit: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(first.driver, "memory");
});
