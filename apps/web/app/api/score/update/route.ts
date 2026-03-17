import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match";
import Event from "../../../../lib/models/Event";
import { pusherServer } from "../../../../lib/pusher";

export async function POST(req: Request) {
  try {
    // ✅ SECURITY: Require authenticated session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const role = user?.role;

    // ✅ SECURITY: Only umpires can update scores
    if (role !== "umpire") {
      return NextResponse.json({ error: "Forbidden: Only umpires can update scores" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const { matchId, player, points, frameNumber, actionDescription } = body;

    if (!matchId || !player || points === undefined || !frameNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (role === "umpire") {
      const match = await Match.findById(matchId).lean() as any;
      if (!match) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }
      if (match.umpireId?.toString() !== user.id) {
        return NextResponse.json({ error: "Forbidden: You are not the umpire for this match" }, { status: 403 });
      }
    }

    // 1. Save to Database
    const newEvent = await Event.create({
      matchId,
      frameNumber,
      player,
      eventType: "score_update",
      points,
      description: actionDescription,
    });

    // 2. BROADCAST THE EVENT TO ALL VIEWERS
    await pusherServer.trigger(`match-${matchId}`, "score-update", {
      player,
      points,
      description: actionDescription,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    return NextResponse.json({ success: true, event: newEvent }, { status: 200 });

  } catch (error: any) {
    console.error("Score Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}