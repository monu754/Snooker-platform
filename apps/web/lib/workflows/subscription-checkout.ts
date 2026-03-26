import { ValidationError, validateSubscriptionCheckoutInput } from "../validation.ts";
import { canPurchasePremium, sanitizeStoredSubscriptionTier } from "../access.ts";

type CheckoutUser = {
  email: string;
  name: string;
  role: string;
  subscriptionTier: string;
  save(): Promise<void>;
};

type CheckoutDeps = {
  createExternalCheckoutSession(payload: { tier: "plus" | "pro"; email: string; name: string }): Promise<string | null>;
};

export async function runSubscriptionCheckoutWorkflow(
  payload: unknown,
  sessionRole: string | undefined,
  user: CheckoutUser | null,
  allowDevBypass: boolean,
  deps: CheckoutDeps,
) {
  const role = sessionRole || "user";
  if (!canPurchasePremium(role)) {
    return { status: 403, body: { error: "Premium upgrades are only available for viewer accounts." } };
  }

  const { tier } = validateSubscriptionCheckoutInput(payload);

  if (!user) {
    return { status: 404, body: { error: "User not found" } };
  }

  const currentTier = sanitizeStoredSubscriptionTier(user.role, user.subscriptionTier as "free" | "plus" | "pro");
  if (currentTier === tier) {
    return { status: 400, body: { error: "You already have this premium tier." } };
  }

  const checkoutUrl = await deps.createExternalCheckoutSession({
    tier,
    email: user.email,
    name: user.name,
  });

  if (checkoutUrl) {
    return { status: 200, body: { success: true, mode: "external", checkoutUrl } };
  }

  if (allowDevBypass) {
    user.subscriptionTier = tier;
    await user.save();
    return {
      status: 200,
      body: {
        success: true,
        mode: "dev-bypass",
        message: `Development billing bypass upgraded your account to ${tier}.`,
        tier,
      },
    };
  }

  return {
    status: 503,
    body: {
      error:
        "Premium checkout is not configured yet. Set BILLING_CHECKOUT_ENDPOINT or enable ALLOW_DEV_BILLING_BYPASS for local testing.",
    },
  };
}

export { ValidationError };
