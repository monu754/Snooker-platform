import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { logError } from "../../../../lib/logger";
import Settings from "../../../../lib/models/Settings";
import { jsonError } from "../../../../lib/request";
import { ensureSettingsDocument } from "../../../../lib/settings";
import { ValidationError, validateSettingsInput } from "../../../../lib/validation";
import { pusherServer } from "../../../../lib/pusher";

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

    const settings = await ensureSettingsDocument();

    return NextResponse.json(settings);
  } catch (error: unknown) {
    logError("settings.admin_fetch_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = validateSettingsInput(await req.json());

    // Update the single settings document (upsert if missing)
    await ensureSettingsDocument();
    const settings = await Settings.findOneAndUpdate({}, { $set: updates }, { new: true });

    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    await pusherServer.trigger("platform-settings", "settings-updated", {
      maintenanceMode: settings.maintenanceMode,
      globalAnnouncement: settings.globalAnnouncement,
      allowRegistration: settings.allowRegistration,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("settings.admin_update_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
