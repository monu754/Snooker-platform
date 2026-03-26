import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // <-- Updated import path
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match";
import User from "../../../../lib/models/User";
import Event from "../../../../lib/models/Event";
import { logError } from "../../../../lib/logger";
import { normalizeViewerSessions } from "../../../../lib/viewer-presence";

export async function GET() {
  try {
    await dbConnect();

    // 1. Production Security: Verify Admin Session
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // 2. Aggregate Real Statistics
    const [liveMatches, scheduledMatches, umpires, recentEvents] = await Promise.all([
      Match.find({ status: "live" }).select("+activeViewerSessions"),
      Match.find({ status: "scheduled" }).sort({ scheduledTime: 1 }).limit(5).select("+activeViewerSessions"),
      User.countDocuments({ role: "umpire" }),
      Event.find({ category: "admin" }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    await Promise.all(
      [...liveMatches, ...scheduledMatches].map(async (match: any) => {
        normalizeViewerSessions(match);
        await match.save();
      }),
    );

    // Calculate total active viewers across all live matches
    const totalViewers = liveMatches.reduce((sum, match) => sum + (match.viewers || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        liveCount: liveMatches.length,
        scheduledCount: await Match.countDocuments({ status: "scheduled" }),
        activeViewers: totalViewers,
        activeUmpires: umpires, 
      },
      actionableMatches: [...liveMatches, ...scheduledMatches].map((match: any) => {
        const item = match.toObject();
        delete item.activeViewerSessions;
        return item;
      }),
      recentEvents: recentEvents
    }, { status: 200 });

  } catch (error) {
    logError("admin.dashboard.fetch_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
