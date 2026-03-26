import test from "node:test";
import assert from "node:assert/strict";
import { runSubscriptionCheckoutWorkflow } from "../../lib/workflows/subscription-checkout.ts";

function buildUser(overrides?: Partial<{ role: string; subscriptionTier: string }>) {
  return {
    email: "viewer@example.com",
    name: "Viewer",
    role: overrides?.role || "user",
    subscriptionTier: overrides?.subscriptionTier || "free",
    async save() {
      return undefined;
    },
  };
}

test("subscription checkout workflow blocks privileged roles", async () => {
  const result = await runSubscriptionCheckoutWorkflow(
    { tier: "plus" },
    "admin",
    buildUser({ role: "admin" }) as any,
    false,
    { createExternalCheckoutSession: async () => null },
  );

  assert.equal(result.status, 403);
});

test("subscription checkout workflow rejects duplicate tier purchases", async () => {
  const result = await runSubscriptionCheckoutWorkflow(
    { tier: "plus" },
    "user",
    buildUser({ subscriptionTier: "plus" }) as any,
    false,
    { createExternalCheckoutSession: async () => null },
  );

  assert.equal(result.status, 400);
});

test("subscription checkout workflow returns external checkout URL when configured", async () => {
  const result = await runSubscriptionCheckoutWorkflow(
    { tier: "pro" },
    "user",
    buildUser() as any,
    false,
    { createExternalCheckoutSession: async () => "https://billing.example/checkout-session" },
  );

  assert.equal(result.status, 200);
  assert.equal((result.body as { checkoutUrl?: string }).checkoutUrl, "https://billing.example/checkout-session");
});

test("subscription checkout workflow supports dev bypass upgrades", async () => {
  const user = buildUser();
  const result = await runSubscriptionCheckoutWorkflow(
    { tier: "plus" },
    "user",
    user as any,
    true,
    { createExternalCheckoutSession: async () => null },
  );

  assert.equal(result.status, 200);
  assert.equal(user.subscriptionTier, "plus");
});
