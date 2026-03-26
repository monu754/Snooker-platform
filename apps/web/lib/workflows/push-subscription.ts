import { isValidPushSubscription, type StoredPushSubscription } from "../push-subscription.ts";

type PushUser = {
  pushSubscriptions?: StoredPushSubscription[];
  save(): Promise<void>;
};

export function getPushSubscriptionStateWorkflow(user: { pushSubscriptions?: StoredPushSubscription[] } | null) {
  return { status: 200, body: { enabled: Boolean(user?.pushSubscriptions?.length) } };
}

export async function savePushSubscriptionWorkflow(
  subscription: unknown,
  user: PushUser | null,
) {
  if (!isValidPushSubscription(subscription)) {
    return { status: 400, body: { error: "Invalid push subscription." } };
  }

  if (!user) {
    return { status: 404, body: { error: "User not found." } };
  }

  const now = new Date();
  const nextSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: subscription.keys,
    createdAt: now,
    updatedAt: now,
  };

  const remaining = (user.pushSubscriptions || []).filter(
    (entry) => entry.endpoint !== subscription.endpoint,
  );

  user.pushSubscriptions = [...remaining, nextSubscription];
  await user.save();

  return { status: 200, body: { success: true } };
}

export async function deletePushSubscriptionWorkflow(
  endpoint: string | undefined,
  user: PushUser | null,
) {
  if (!user) {
    return { status: 404, body: { error: "User not found." } };
  }

  user.pushSubscriptions = (user.pushSubscriptions || []).filter((entry) =>
    typeof endpoint === "string" ? entry.endpoint !== endpoint : false,
  );
  await user.save();

  return { status: 200, body: { success: true } };
}
