import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; 
import dbConnect from "../../../../lib/mongodb"; 
import User from "../../../../lib/models/User"; 
import Event from "../../../../lib/models/Event"; 
import bcrypt from "bcryptjs"; 
import { sendUmpireWelcomeEmail } from "../../../../lib/mail";
import { logError, logWarn } from "../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../lib/request";
import { isMaintenanceModeEnabled } from "../../../../lib/settings";
import { ValidationError, validateUmpireCreationInput } from "../../../../lib/validation";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const umpires = await User.find({ role: "umpire" }).select("-password").lean();
    return NextResponse.json({ success: true, umpires }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Umpire creation is temporarily unavailable during maintenance mode.", 503);
    }

    const rateLimitResponse = applyRateLimit(req, "umpires:create", 10, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { name, email, password } = validateUmpireCreationInput(await req.json());

    const existingUser = await User.findOne({ email });
    if (existingUser) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new Umpire
    const newUmpire = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "umpire"
    });

    // Send welcome email with credentials
    // We pass the raw password here BEFORE returning it encoded or hashed in response (though it's hashed in DB)
    const mailResult = await sendUmpireWelcomeEmail(email, name, password);

    // SAFETY NET: Wrap the event logger in a try/catch. 
    // If it fails (e.g., missing matchId), it won't crash the umpire creation!
    try {
      await Event.create({
        player: "System",
        eventType: "system_alert",
        points: 0,
        description: `New Umpire Registered: ${name}`,
        category: "admin",
        frameNumber: 0
      });
    } catch (eventError) {
      logWarn("umpires.create_event_failed", { error: String(eventError) });
    }

    return NextResponse.json({ 
      success: true, 
      umpire: newUmpire,
      mailSent: mailResult.success,
      mailError: mailResult.error ? (mailResult.error as any).message : null
    }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("umpires.create_failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server Error" }, { status: 500 });
  }
}
