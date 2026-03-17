import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; 
import dbConnect from "../../../../lib/mongodb"; 
import User from "../../../../lib/models/User"; 
import Event from "../../../../lib/models/Event"; 
import bcrypt from "bcryptjs"; 
import { sendUmpireWelcomeEmail } from "../../../../lib/mail";

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
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

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
    await sendUmpireWelcomeEmail(email, name, password);

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
      console.warn("Non-fatal: Could not log event to dashboard (likely missing matchId).", eventError);
    }

    return NextResponse.json({ success: true, umpire: newUmpire }, { status: 201 });

  } catch (error: any) {
    console.error("Umpire Creation Error:", error);
    // Return the EXACT error message to the frontend so we can see what broke
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}