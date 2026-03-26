export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; 
import dbConnect from "../../../lib/mongodb"; 
import Match from "../../../lib/models/Match"; 
import Event from "../../../lib/models/Event";
import { sendMatchAssignmentEmail } from "../../../lib/mail";
import { logError } from "../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../lib/request";
import { enforceTrustedOrigin } from "../../../lib/security";
import { isMaintenanceModeEnabled } from "../../../lib/settings";
import { ValidationError, validateMatchInput } from "../../../lib/validation";
import { normalizeViewerSessions } from "../../../lib/viewer-presence";
import { areRegisteredPlayers } from "../../../lib/player-profiles";
import { findAssignedUmpire } from "../../../lib/umpire-assignment";
import { runAdminCreateMatchWorkflow } from "../../../lib/workflows/admin-match-management";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    let query = {};
    if (statusFilter) query = { status: statusFilter };

    const matches = await Match.find(query).sort({ scheduledTime: 1 }).select("+activeViewerSessions");

    return NextResponse.json({
      success: true,
      matches: matches.map((match: any) => {
        normalizeViewerSessions(match);
        const item = match.toObject();
        delete item.activeViewerSessions;
        return item;
      }),
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Match creation is temporarily unavailable during maintenance mode.", 503);
    }

    const rateLimitResponse = await applyRateLimit(req, "matches:create", 20, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();

    // Security Check
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const result = await runAdminCreateMatchWorkflow(await req.json(), {
      areRegisteredPlayers,
      findAssignedUmpire,
      createMatch: (input) => Match.create(input as any),
      createEvent: (input) => Event.create(input),
      deleteMatch: async () => null,
      deleteEvents: async () => undefined,
      deleteChatMessages: async () => undefined,
      sendMatchAssignmentEmail,
    });

    return NextResponse.json(result.body, { status: result.status });

  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("matches.create_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
