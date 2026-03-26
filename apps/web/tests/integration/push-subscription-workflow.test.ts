import test from "node:test";
import assert from "node:assert/strict";
import {
  deletePushSubscriptionWorkflow,
  getPushSubscriptionStateWorkflow,
  savePushSubscriptionWorkflow,
} from "../../lib/workflows/push-subscription.ts";

function buildUser(pushSubscriptions: Array<any> = []) {
  return {
    pushSubscriptions,
    async save() {
      return undefined;
    },
  };
}

test("push subscription workflow reports enabled state", () => {
  const result = getPushSubscriptionStateWorkflow(
    buildUser([
      {
        endpoint: "https://push.example/subscription-1",
        keys: { p256dh: "key", auth: "auth" },
      },
    ]),
  );

  assert.equal(result.body.enabled, true);
});

test("push subscription workflow rejects invalid payloads", async () => {
  const result = await savePushSubscriptionWorkflow({ endpoint: "" }, buildUser());
  assert.equal(result.status, 400);
});

test("push subscription workflow upserts by endpoint", async () => {
  const user = buildUser([
    {
      endpoint: "https://push.example/subscription-1",
      expirationTime: null,
      keys: { p256dh: "old-key", auth: "old-auth" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ]);

  const result = await savePushSubscriptionWorkflow(
    {
      endpoint: "https://push.example/subscription-1",
      expirationTime: null,
      keys: { p256dh: "new-key", auth: "new-auth" },
    },
    user,
  );

  assert.equal(result.status, 200);
  assert.equal(user.pushSubscriptions.length, 1);
  assert.equal(user.pushSubscriptions[0].keys.p256dh, "new-key");
});

test("push subscription workflow deletes by endpoint", async () => {
  const user = buildUser([
    {
      endpoint: "https://push.example/subscription-1",
      keys: { p256dh: "key-1", auth: "auth-1" },
    },
    {
      endpoint: "https://push.example/subscription-2",
      keys: { p256dh: "key-2", auth: "auth-2" },
    },
  ]);

  const result = await deletePushSubscriptionWorkflow("https://push.example/subscription-1", user);

  assert.equal(result.status, 200);
  assert.equal(user.pushSubscriptions.length, 1);
  assert.equal(user.pushSubscriptions[0].endpoint, "https://push.example/subscription-2");
});
