export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { logError } from "../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../lib/request";
import { isMaintenanceModeEnabled } from "../../../lib/settings";
import { storeUploadedImage } from "../../../lib/upload-storage";

export async function POST(req: Request) {
  try {
    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Uploads are temporarily unavailable during maintenance mode.", 503);
    }

    const rateLimitResponse = applyRateLimit(req, "upload", 20, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Only admins can upload files
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const stored = await storeUploadedImage(file);
    return NextResponse.json({ success: true, url: stored.url, storageMode: stored.storageMode }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }

    logError("upload.failed", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
