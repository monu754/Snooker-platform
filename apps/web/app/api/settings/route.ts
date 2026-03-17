import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Settings from "../../../lib/models/Settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    // Fetch the single settings document (exclude timestamps)
    let settings = await Settings.findOne({}, { maintenanceMode: 1, globalAnnouncement: 1, allowRegistration: 1, _id: 0 });
    
    // If no settings exist yet, return defaults
    if (!settings) {
      return NextResponse.json({
        maintenanceMode: false,
        globalAnnouncement: "",
        allowRegistration: true,
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Error fetching public settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
