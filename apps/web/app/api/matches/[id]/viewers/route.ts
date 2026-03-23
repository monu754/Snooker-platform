export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../../../lib/mongodb";
import Match from "../../../../../lib/models/Match";
import { pusherServer } from "../../../../../lib/pusher";
import { logError } from "../../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../../lib/request";
import { removeViewerSession, upsertViewerSession } from "../../../../../lib/viewer-presence";
import { broadcastViewerStats } from "../../../../../lib/dashboard-events";

async function readViewerToken(req: Request) {
  try {
    const payload = await req.json();
    if (typeof payload?.viewerToken !== "string" || !payload.viewerToken.trim()) {
      return null;
    }

    return payload.viewerToken.trim();
  } catch {
    return null;
  }
}

/** Heartbeat/upsert for a viewer currently on the watch page. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResponse = applyRateLimit(req, "viewers:heartbeat", 180, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    const params = await props.params;
    const viewerToken = await readViewerToken(req);
    if (!viewerToken) {
      return jsonError("Viewer token is required", 400);
    }

    const match = await Match.findById(params.id).select("+activeViewerSessions");
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const viewers = upsertViewerSession(match as any, viewerToken);
    await match.save();
    await pusherServer.trigger(`match-${params.id}`, "viewer-update", { viewers });
    await broadcastViewerStats(params.id, viewers);

    return NextResponse.json({ success: true, viewers });
  } catch (error) {
    logError("viewers.heartbeat_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/** Called when a viewer leaves the watch page. */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResponse = applyRateLimit(req, "viewers:decrement", 60, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    const params = await props.params;
    const viewerToken = await readViewerToken(req);
    if (!viewerToken) {
      return jsonError("Viewer token is required", 400);
    }

    const match = await Match.findById(params.id).select("+activeViewerSessions");
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const viewers = removeViewerSession(match as any, viewerToken);
    await match.save();
    await pusherServer.trigger(`match-${params.id}`, "viewer-update", { viewers });
    await broadcastViewerStats(params.id, viewers);

    return NextResponse.json({ success: true, viewers });
  } catch (error) {
    logError("viewers.decrement_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
