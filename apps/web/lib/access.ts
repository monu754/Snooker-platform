import {
  BILLABLE_SUBSCRIPTION_TIERS,
  normalizeSubscriptionTier,
  SUBSCRIPTION_LIMITS,
  type SubscriptionTier,
} from "./subscriptions.ts";

export type UserRole = "user" | "admin" | "umpire";

export function isPrivilegedRole(role: string | undefined | null): role is "admin" | "umpire" {
  return role === "admin" || role === "umpire";
}

export function canPurchasePremium(role: string | undefined | null) {
  return role === "user";
}

export function sanitizeStoredSubscriptionTier(role: string | undefined | null, tier: unknown): SubscriptionTier {
  if (!canPurchasePremium(role)) {
    return "free";
  }

  return normalizeSubscriptionTier(tier);
}

export function getEffectiveMaxStreams(role: string | undefined | null, tier: unknown) {
  if (isPrivilegedRole(role)) {
    return 6;
  }

  return SUBSCRIPTION_LIMITS[sanitizeStoredSubscriptionTier(role, tier)].maxStreams;
}

export function getAccessLabel(role: string | undefined | null, tier: unknown) {
  if (role === "admin") {
    return "Admin Access";
  }

  if (role === "umpire") {
    return "Umpire Access";
  }

  return SUBSCRIPTION_LIMITS[sanitizeStoredSubscriptionTier(role, tier)].label;
}

export function isBillableTier(value: unknown): value is (typeof BILLABLE_SUBSCRIPTION_TIERS)[number] {
  return BILLABLE_SUBSCRIPTION_TIERS.includes(value as (typeof BILLABLE_SUBSCRIPTION_TIERS)[number]);
}
