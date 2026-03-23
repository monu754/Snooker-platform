export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; 
import dbConnect from "../../../lib/mongodb"; 
import Match from "../../../lib/models/Match"; 
import Event from "../../../lib/models/Event";
import User from "../../../lib/models/User";
import { sendMatchAssignmentEmail } from "../../../lib/mail";
import { logError } from "../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../lib/request";
import { isMaintenanceModeEnabled } from "../../../lib/settings";
import { ValidationError, validateMatchInput } from "../../../lib/validation";
import { normalizeViewerSessions } from "../../../lib/viewer-presence";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    let query = {};
    if (statusFilter) query = { status: statusFilter };

    const matches = await Match.find(query).sort({ scheduledTime: 1 }).select("+activeViewerSessions");
    await Promise.all(
      matches.map(async (match: any) => {
        normalizeViewerSessions(match);
        await match.save();
      }),
    );

    return NextResponse.json({
      success: true,
      matches: matches.map((match: any) => {
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
    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Match creation is temporarily unavailable during maintenance mode.", 503);
    }

    const rateLimitResponse = applyRateLimit(req, "matches:create", 20, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();

    // Security Check
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { title, playerA, playerB, format, totalFrames, scheduledTime, venue, streamUrl, thumbnailUrl, umpireId } =
      validateMatchInput(await req.json());

    const framesToWin = Math.floor(Number(totalFrames) / 2) + 1;

    // Build the match object
    const matchData: any = {
      title,
      playerA,
      playerB,
      format,
      totalFrames: Number(totalFrames),
      framesToWin,
      scheduledTime,
      venue,
      streamUrl: streamUrl || "",
      thumbnailUrl: thumbnailUrl || "",
      status: "scheduled",
    };

    // Only attach umpireId if a valid one was selected
    if (umpireId && umpireId !== "") {
      matchData.umpireId = umpireId;
    }

    // 1. Save the new match to MongoDB
    const newMatch = await Match.create(matchData);

    // 2. Log the creation to System Events for the Dashboard
    await Event.create({
      matchId: newMatch._id,
      frameNumber: 0,
      player: "System",
      eventType: "system_alert",
      points: 0,
      description: `Match Created: ${title} scheduled for ${new Date(scheduledTime).toLocaleDateString()}`,
      category: "admin"
    });

    // 3. If an umpire was assigned, send them an email
    let mailSent = false;
    let mailError = null;

    if (umpireId) {
      const umpire = await User.findById(umpireId).lean();
      if (umpire && (umpire as any).email) {
          const mailResult = await sendMatchAssignmentEmail(
            (umpire as any).email,
            (umpire as any).name,
            title,
            scheduledTime.toISOString(),
          );
        mailSent = mailResult.success;
        if (!mailResult.success) {
          mailError = (mailResult.error as any)?.message || "Failed to send email";
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      match: newMatch,
      mailSent,
      mailError
    }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("matches.create_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
