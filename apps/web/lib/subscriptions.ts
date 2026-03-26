export const SUBSCRIPTION_TIERS = ["free", "plus", "pro"] as const;
export const BILLABLE_SUBSCRIPTION_TIERS = ["plus", "pro"] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, { maxStreams: number; label: string }> = {
  free: { maxStreams: 1, label: "Free" },
  plus: { maxStreams: 2, label: "Plus" },
  pro: { maxStreams: 4, label: "Pro" },
};

export const SUBSCRIPTION_PRICING: Record<
  (typeof BILLABLE_SUBSCRIPTION_TIERS)[number],
  { label: string; monthlyPriceUsd: number; description: string }
> = {
  plus: {
    label: "Plus",
    monthlyPriceUsd: 9,
    description: "Two-table multi-stream, upgraded alerts, and premium viewer tools.",
  },
  pro: {
    label: "Pro",
    monthlyPriceUsd: 19,
    description: "Four-table wall, full premium viewing, and priority feature access.",
  },
};

export function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  return SUBSCRIPTION_TIERS.includes(value as SubscriptionTier) ? (value as SubscriptionTier) : "free";
}
