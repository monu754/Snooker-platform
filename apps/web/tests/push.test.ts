import test from "node:test";
import assert from "node:assert/strict";
import { isValidPushSubscription } from "../lib/push-subscription.ts";

test("isValidPushSubscription accepts browser push payloads", () => {
  assert.equal(
    isValidPushSubscription({
      endpoint: "https://example.push/subscription/123",
      expirationTime: null,
      keys: {
        p256dh: "public-key",
        auth: "auth-key",
      },
    }),
    true,
  );
});

test("isValidPushSubscription rejects incomplete payloads", () => {
  assert.equal(
    isValidPushSubscription({
      endpoint: "",
      keys: {
        p256dh: "public-key",
      },
    }),
    false,
  );
});
