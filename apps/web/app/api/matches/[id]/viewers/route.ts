export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../../../lib/mongodb";
import Match from "../../../../../lib/models/Match";
import { pusherServer } from "../../../../../lib/pusher";

/** Called when a viewer opens the watch page. Increments viewer count. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await props.params;
    const updated = await Match.findByIdAndUpdate(
      params.id,
      { $inc: { viewers: 1 } },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    // Broadcast new viewer count so admin dashboard can be updated in real time
    await pusherServer.trigger(`match-${params.id}`, "viewer-update", { viewers: (updated as any).viewers });

    return NextResponse.json({ success: true, viewers: (updated as any).viewers });
  } catch (error) {
    console.error("Viewer increment error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/** Called when a viewer leaves the watch page. Decrements viewer count (min 0). */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await props.params;

    // First get current count so we don't go negative
    const match = await Match.findById(params.id);
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const newViewers = Math.max(0, (match.viewers || 0) - 1);
    const updated = await Match.findByIdAndUpdate(
      params.id,
      { $set: { viewers: newViewers } },
      { new: true }
    ).lean();

    await pusherServer.trigger(`match-${params.id}`, "viewer-update", { viewers: (updated as any).viewers });

    return NextResponse.json({ success: true, viewers: (updated as any).viewers });
  } catch (error) {
    console.error("Viewer decrement error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
