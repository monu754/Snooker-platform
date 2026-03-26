export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../../../lib/mongodb";
import Match from "../../../../../lib/models/Match";
import { pusherServer } from "../../../../../lib/pusher";
import { logError } from "../../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../../lib/request";
import { broadcastViewerStats } from "../../../../../lib/dashboard-events";
import { runViewerHeartbeatWorkflow, runViewerReleaseWorkflow } from "../../../../../lib/workflows/viewer-presence";

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
    const rateLimitResponse = await applyRateLimit(req, "viewers:heartbeat", 180, 60_000);
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
    const result = await runViewerHeartbeatWorkflow(params.id, viewerToken, match as any, {
      trigger: async (matchId, eventName, payload) => {
        await pusherServer.trigger(`match-${matchId}`, eventName, payload);
      },
      broadcastViewerStats,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("viewers.heartbeat_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/** Called when a viewer leaves the watch page. */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResponse = await applyRateLimit(req, "viewers:decrement", 60, 60_000);
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
    const result = await runViewerReleaseWorkflow(params.id, viewerToken, match as any, {
      trigger: async (matchId, eventName, payload) => {
        await pusherServer.trigger(`match-${matchId}`, eventName, payload);
      },
      broadcastViewerStats,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("viewers.decrement_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
