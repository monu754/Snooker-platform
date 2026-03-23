import { NextResponse } from "next/server";
import { logError } from "../../../lib/logger";
import { getPlatformSettings } from "../../../lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getPlatformSettings());
  } catch (error: unknown) {
    logError("settings.public_fetch_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
