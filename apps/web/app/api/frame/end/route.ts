import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match";
import Event from "../../../../lib/models/Event";

export async function POST(req: Request) {
  try {
    // ✅ SECURITY: Require authenticated session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const role = user?.role;

    // ✅ SECURITY: Only umpires can end frames
    if (role !== "umpire") {
      return NextResponse.json({ error: "Only umpires can end frames" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const { matchId, winner, frameNumber } = body;

    if (!matchId || !winner || !frameNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Umpires can only end frames for matches assigned to them
    const match = await Match.findById(matchId).lean() as any;
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.umpireId?.toString() !== user.id) {
      return NextResponse.json({ error: "You are not assigned to umpire this match" }, { status: 403 });
    }

    // Log the Frame End Event
    const newEvent = await Event.create({
      matchId,
      frameNumber,
      player: winner,
      eventType: "frame_end",
      points: 0,
      description: `Player ${winner} won Frame ${frameNumber}`,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Frame ended successfully", 
      event: newEvent 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Frame End Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}