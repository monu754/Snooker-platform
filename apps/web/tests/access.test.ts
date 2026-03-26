import test from "node:test";
import assert from "node:assert/strict";
import {
  canPurchasePremium,
  getAccessLabel,
  getEffectiveMaxStreams,
  sanitizeStoredSubscriptionTier,
} from "../lib/access.ts";

test("privileged roles do not use premium tiers", () => {
  assert.equal(canPurchasePremium("admin"), false);
  assert.equal(canPurchasePremium("umpire"), false);
  assert.equal(sanitizeStoredSubscriptionTier("admin", "pro"), "free");
  assert.equal(sanitizeStoredSubscriptionTier("umpire", "plus"), "free");
});

test("viewer roles keep premium tiers", () => {
  assert.equal(canPurchasePremium("user"), true);
  assert.equal(sanitizeStoredSubscriptionTier("user", "pro"), "pro");
});

test("effective access grants extra streams to privileged roles", () => {
  assert.equal(getEffectiveMaxStreams("user", "free"), 1);
  assert.equal(getEffectiveMaxStreams("user", "pro"), 4);
  assert.equal(getEffectiveMaxStreams("admin", "free"), 6);
  assert.equal(getAccessLabel("umpire", "free"), "Umpire Access");
});
