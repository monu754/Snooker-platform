export type StoredPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function isValidPushSubscription(input: unknown): input is StoredPushSubscription {
  const subscription = input as StoredPushSubscription | null;

  return Boolean(
    subscription &&
      typeof subscription.endpoint === "string" &&
      subscription.endpoint &&
      subscription.keys &&
      typeof subscription.keys.p256dh === "string" &&
      typeof subscription.keys.auth === "string",
  );
}
