export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match"; 
import Event from "../../../../lib/models/Event";
import { pusherServer } from "../../../../lib/pusher";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await props.params;
    const match = await Match.findById(params.id).lean();
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    
    // Also fetch match events for the initial load
    const events = await Event.find({ matchId: params.id }).sort({ createdAt: -1 }).lean();
    
    return NextResponse.json({ success: true, match, events }, { status: 200 });
  } catch (error) {
    console.error("Match Fetch Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "umpire"].includes((session.user as any)?.role)) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    
    // If user is umpire, verify they are assigned to this match
    if ((session.user as any)?.role === "umpire") {
      const existingMatch = await Match.findById(params.id);
      if (!existingMatch || existingMatch.umpireId?.toString() !== (session.user as any)?.id) {
         return NextResponse.json({ error: "Forbidden. Not assigned to this match." }, { status: 403 });
      }
    }

    const body = await req.json();
    
    // Extract eventLog if present (so it doesn't try to save it to Match model)
    const { eventLog, ...matchUpdates } = body;

    const updatedMatch = await Match.findByIdAndUpdate(
      params.id,
      { $set: matchUpdates },
      { new: true } 
    ).lean();

    if (!updatedMatch) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Broadcast the full updated match state
    await pusherServer.trigger(`match-${params.id}`, "match-updated", updatedMatch);

    // If an event log was provided, save it and broadcast it
    if (eventLog) {
      const newEvent = await Event.create({
        matchId: params.id,
        frameNumber: updatedMatch.currentFrame || 1,
        player: eventLog.player,
        eventType: eventLog.type === "score" ? "score_update" : (eventLog.type === "foul" ? "foul" : "system"),
        points: typeof eventLog.points === "string" ? parseInt(eventLog.points.replace(/[^0-9-]/g, '')) || 0 : eventLog.points,
        description: eventLog.action,
      });

      await pusherServer.trigger(`match-${params.id}`, "new-event", {
        id: newEvent._id.toString(),
        time: eventLog.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        player: eventLog.player,
        action: eventLog.action,
        points: eventLog.points,
        type: eventLog.type
      });
    }

    return NextResponse.json({ success: true, match: updatedMatch }, { status: 200 });
  } catch (error) {
    console.error("Match Update Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    await Match.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}