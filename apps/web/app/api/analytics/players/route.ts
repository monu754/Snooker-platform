export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match";
import Event from "../../../../lib/models/Event";
import { buildPlayerAnalytics } from "../../../../lib/analytics";
import { logError } from "../../../../lib/logger";

export async function GET() {
  try {
    await dbConnect();
    const [matches, events] = await Promise.all([
      Match.find({ status: "finished" }, { playerA: 1, playerB: 1, framesWonA: 1, framesWonB: 1, winner: 1, status: 1 }).lean(),
      Event.find({}, { player: 1, eventType: 1, points: 1, description: 1 }).lean(),
    ]);

    const players = buildPlayerAnalytics(matches as any[], events as any[]);
    return NextResponse.json({ success: true, players }, { status: 200 });
  } catch (error) {
    logError("analytics.players_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
