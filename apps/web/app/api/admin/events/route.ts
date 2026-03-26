import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; 
import dbConnect from "../../../../lib/mongodb"; 
import Event from "../../../../lib/models/Event"; 
import { logError } from "../../../../lib/logger";
import { applyRateLimit } from "../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../lib/security";

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
    logError("admin.events.fetch_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// DELETE: Clear all system events
export async function DELETE(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const rateLimitResponse = await applyRateLimit(req, "admin:events:clear", 5, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await Event.deleteMany({});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logError("admin.events.clear_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
