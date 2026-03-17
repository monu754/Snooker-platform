import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import Settings from "../../../../lib/models/Settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
       // Optionally, if non-admins need read access to settings (like maintenance mode),
       // you can remove this check or create a separate public endpoint.
       // For admin dashboard editing, we keep the check.
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch the single settings document
    let settings = await Settings.findOne({});
    
    // If no settings exist yet, create a default one
    if (!settings) {
      settings = await Settings.create({
        maintenanceMode: false,
        globalAnnouncement: "",
        allowRegistration: true,
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await req.json();
    await dbConnect();

    // Update the single settings document (upsert if missing)
    let settings = await Settings.findOne({});
    if (!settings) {
       settings = await Settings.create({ ...updates });
    } else {
       settings = await Settings.findOneAndUpdate({}, { $set: updates }, { new: true });
    }

    // Trigger pusher update
    const { default: Pusher } = await import("pusher");
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });

    await pusher.trigger("platform-settings", "settings-updated", {
      maintenanceMode: settings.maintenanceMode,
      globalAnnouncement: settings.globalAnnouncement,
      allowRegistration: settings.allowRegistration,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
