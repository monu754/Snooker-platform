export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { logError, logInfo } from "../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../lib/security";
import { ValidationError, runSubscriptionCheckoutWorkflow } from "../../../../lib/workflows/subscription-checkout";

async function createExternalCheckoutSession(payload: {
  tier: "plus" | "pro";
  email: string;
  name: string;
}) {
  const endpoint = process.env.BILLING_CHECKOUT_ENDPOINT;
  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.BILLING_API_KEY ? { Authorization: `Bearer ${process.env.BILLING_API_KEY}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create billing checkout session.");
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Billing provider returned an invalid checkout response.");
  }

  return data.url;
}

export async function POST(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const rateLimitResponse = await applyRateLimit(req, "subscription:checkout", 10, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError("Unauthorized", 401);
    }

    const payload = await req.json();
    await dbConnect();
    const user = await User.findOne({ email: (session.user as { email?: string }).email });
    const result = await runSubscriptionCheckoutWorkflow(
      payload,
      (session.user as { role?: string }).role,
      user as any,
      process.env.ALLOW_DEV_BILLING_BYPASS === "true",
      {
        createExternalCheckoutSession,
      },
    );

    if (result.body && "tier" in result.body && typeof result.body.tier === "string") {
      logInfo("billing.checkout.dev_bypass_completed", {
        email: user?.email,
        tier: result.body.tier,
      });
    } else if (result.body && "checkoutUrl" in result.body) {
      logInfo("billing.checkout.created", {
        email: user?.email,
        tier: (payload as { tier?: string }).tier,
      });
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("billing.checkout_failed", error instanceof Error ? error : new Error("Unknown billing error"));
    return jsonError("Unable to start premium checkout right now.", 500);
  }
}
