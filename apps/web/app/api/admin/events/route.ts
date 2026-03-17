import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; 
import dbConnect from "../../../../lib/mongodb"; 
import Event from "../../../../lib/models/Event"; 

// GET: Fetch ALL system events
export async function GET() {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all events, newest first
    const events = await Event.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, events }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// DELETE: Clear all system events (You already had this)
export async function DELETE() {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await Event.deleteMany({});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to clear events:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}