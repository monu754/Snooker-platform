import test from "node:test";
import assert from "node:assert/strict";
import { shouldNotifyFavoriteUsersOnStatusChange } from "../../lib/workflows/match-live-alerts.ts";
import {
  savePushSubscriptionWorkflow,
  getPushSubscriptionStateWorkflow,
} from "../../lib/workflows/push-subscription.ts";

function buildUser(pushSubscriptions: Array<any> = []) {
  return {
    pushSubscriptions,
    async save() {
      return undefined;
    },
  };
}

test("favorite alert workflow enables push then triggers only on live transition", async () => {
  const user = buildUser();

  const saveResult = await savePushSubscriptionWorkflow(
    {
      endpoint: "https://push.example/subscription-1",
      expirationTime: null,
      keys: { p256dh: "key", auth: "auth" },
    },
    user,
  );

  assert.equal(saveResult.status, 200);
  assert.equal(getPushSubscriptionStateWorkflow(user).body.enabled, true);
  assert.equal(shouldNotifyFavoriteUsersOnStatusChange("scheduled", "live"), true);
  assert.equal(shouldNotifyFavoriteUsersOnStatusChange("live", "live"), false);
  assert.equal(shouldNotifyFavoriteUsersOnStatusChange("paused", "paused"), false);
});
