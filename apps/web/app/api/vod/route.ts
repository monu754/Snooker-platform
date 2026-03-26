export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Match from "../../../lib/models/Match";
import Event from "../../../lib/models/Event";
import { logError } from "../../../lib/logger";

export async function GET() {
  try {
    await dbConnect();
    const matches = await Match.find(
      { status: "finished" },
      {
        title: 1,
        playerA: 1,
        playerB: 1,
        scheduledTime: 1,
        winner: 1,
        framesWonA: 1,
        framesWonB: 1,
        thumbnailUrl: 1,
        streamUrl: 1,
        vodUrl: 1,
      },
    )
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean();

    const matchIds = matches.map((match: any) => match._id);
    const events = await Event.find(
      { matchId: { $in: matchIds }, eventType: { $in: ["score_update", "foul"] } },
      { matchId: 1, description: 1, createdAt: 1, points: 1 },
    )
      .sort({ createdAt: 1 })
      .lean();

    const chaptersByMatch = new Map<string, Array<{ title: string; timeLabel: string }>>();
    for (const event of events as any[]) {
      const key = event.matchId.toString();
      const chapters = chaptersByMatch.get(key) || [];
      if (chapters.length < 6) {
        chapters.push({
          title: event.description || `Key moment (+${event.points || 0})`,
          timeLabel: new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        chaptersByMatch.set(key, chapters);
      }
    }

    return NextResponse.json({
      success: true,
      matches: matches.map((match: any) => ({
        ...match,
        playbackUrl: match.vodUrl || match.streamUrl || "",
        chapters: chaptersByMatch.get(match._id.toString()) || [],
      })),
    });
  } catch (error) {
    logError("vod.fetch_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
