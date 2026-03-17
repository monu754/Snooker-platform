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

    // ✅ SECURITY: Only umpires and admins can record fouls
    if (role !== "umpire") {
      return NextResponse.json({ error: "Only umpires can add fouls" }, { status: 403 });
    }

    // Umpires can only update matches assigned to them
    await dbConnect();

    const body = await req.json();
    const { matchId, player, penalty, frameNumber } = body;

    if (!matchId || !player || !penalty || !frameNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const match = await Match.findById(matchId).lean() as any;
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.umpireId?.toString() !== user.id) {
      return NextResponse.json({ error: "You are not assigned to umpire this match" }, { status: 403 });
    }

    // 1. Save to Database
    const newEvent = await Event.create({
      matchId,
      frameNumber,
      player, 
      eventType: "foul",
      points: penalty,
      description: `Foul by Player ${player} (${penalty} pts to opponent)`,
    });

    // 2. BROADCAST THE FOUL TO ALL VIEWERS
    await pusherServer.trigger(`match-${matchId}`, "foul-update", {
      player,
      penalty,
      description: `Foul (Miss)`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    return NextResponse.json({ 
      success: true, 
      message: "Foul recorded successfully", 
      event: newEvent 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Foul Add Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}