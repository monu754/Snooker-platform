import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { logError } from "../../../../lib/logger";
import { jsonError } from "../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../lib/security";
import { isPushConfigured } from "../../../../lib/push";
import {
  deletePushSubscriptionWorkflow,
  getPushSubscriptionStateWorkflow,
  savePushSubscriptionWorkflow,
} from "../../../../lib/workflows/push-subscription";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { email?: string } | undefined;

    if (!sessionUser?.email) {
      return jsonError("Unauthorized", 401);
    }

    await dbConnect();
    const user = await User.findOne({ email: sessionUser.email }, { pushSubscriptions: 1 }).lean();
    const result = getPushSubscriptionStateWorkflow(user);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("push.subscription.fetch_failed", error);
    return jsonError("Unable to load push subscription status.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    if (!isPushConfigured()) {
      return jsonError("Push notifications are not configured.", 503);
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { email?: string } | undefined;

    if (!sessionUser?.email) {
      return jsonError("Unauthorized", 401);
    }

    const body = (await req.json()) as { subscription?: unknown };

    await dbConnect();
    const user = await User.findOne({ email: sessionUser.email }).select("pushSubscriptions");
    const result = await savePushSubscriptionWorkflow(body.subscription, user);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("push.subscription.save_failed", error);
    return jsonError("Unable to save push subscription.", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { email?: string } | undefined;

    if (!sessionUser?.email) {
      return jsonError("Unauthorized", 401);
    }

    const body = (await req.json().catch(() => ({}))) as { endpoint?: string };

    await dbConnect();
    const user = await User.findOne({ email: sessionUser.email }).select("pushSubscriptions");
    const result = await deletePushSubscriptionWorkflow(body.endpoint, user);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("push.subscription.delete_failed", error);
    return jsonError("Unable to remove push subscription.", 500);
  }
}
