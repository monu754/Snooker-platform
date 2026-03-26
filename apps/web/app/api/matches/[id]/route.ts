export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match"; 
import Event from "../../../../lib/models/Event";
import ChatMessage from "../../../../lib/models/ChatMessage";
import { pusherServer } from "../../../../lib/pusher";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { sendMatchAssignmentEmail } from "../../../../lib/mail";
import { logError } from "../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../lib/security";
import { isMaintenanceModeEnabled } from "../../../../lib/settings";
import { ValidationError, validateMatchPatchInput } from "../../../../lib/validation";
import { normalizeViewerSessions } from "../../../../lib/viewer-presence";
import { areRegisteredPlayers } from "../../../../lib/player-profiles";
import { findAssignedUmpire } from "../../../../lib/umpire-assignment";
import { notifyFavoriteUsersForLiveMatch } from "../../../../lib/push";
import { shouldNotifyFavoriteUsersOnStatusChange } from "../../../../lib/workflows/match-live-alerts";
import { runAdminDeleteMatchWorkflow } from "../../../../lib/workflows/admin-match-management";

const UMPIRE_ALLOWED_PATCH_FIELDS = new Set([
  "status",
  "activePlayer",
  "scoreA",
  "scoreB",
  "framesWonA",
  "framesWonB",
  "currentFrame",
  "winner",
]);

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await props.params;
    const match = await Match.findById(params.id).select("+activeViewerSessions");
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    normalizeViewerSessions(match as any);

    const events = await Event.find({ matchId: params.id }).sort({ createdAt: -1 }).lean();

    const matchObject = match.toObject();
    delete (matchObject as any).activeViewerSessions;

    return NextResponse.json({ success: true, match: matchObject, events }, { status: 200 });
  } catch (error) {
    logError("matches.fetch_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Match updates are temporarily unavailable during maintenance mode.", 503);
    }

    const rateLimitResponse = await applyRateLimit(req, "matches:update", 60, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session || !["admin", "umpire"].includes((session.user as any)?.role)) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;

    const existingMatch = await Match.findById(params.id).select("+favoriteAlertUserIds");
    if (!existingMatch) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if ((session.user as any)?.role === "umpire" && existingMatch.umpireId?.toString() !== (session.user as any)?.id) {
      return NextResponse.json({ error: "Forbidden. Not assigned to this match." }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    const { updates: rawUpdates, undoEventId, eventLog } = validateMatchPatchInput(await req.json());
    const matchUpdates =
      role === "admin"
        ? rawUpdates
        : Object.fromEntries(
            Object.entries(rawUpdates).filter(([key]) => UMPIRE_ALLOWED_PATCH_FIELDS.has(key)),
          );

    if (role === "umpire" && Object.keys(matchUpdates).length !== Object.keys(rawUpdates).length) {
      return jsonError("Umpires can only update scoring and live match status fields.", 403);
    }

    if (Object.keys(matchUpdates).length === 0 && !eventLog && !undoEventId) {
      return jsonError("No valid updates provided", 400);
    }

    if (role === "admin" && (matchUpdates.playerA !== undefined || matchUpdates.playerB !== undefined)) {
      const nextPlayerA = String(matchUpdates.playerA ?? existingMatch.playerA);
      const nextPlayerB = String(matchUpdates.playerB ?? existingMatch.playerB);

      if (nextPlayerA === nextPlayerB) {
        return jsonError("Player A and Player B must be different registered players.", 400);
      }

      const playersRegistered = await areRegisteredPlayers([nextPlayerA, nextPlayerB]);
      if (!playersRegistered) {
        return jsonError("Both match players must exist in the player directory before saving the match.", 400);
      }
    }

    if (matchUpdates.totalFrames !== undefined && matchUpdates.framesToWin === undefined) {
      matchUpdates.framesToWin = Math.floor(Number(matchUpdates.totalFrames) / 2) + 1;
    }

    const originalUmpireId = existingMatch.umpireId?.toString() || "";
    const nextAssignedUmpire =
      role === "admin" && typeof matchUpdates.umpireId === "string" && matchUpdates.umpireId.trim()
        ? await findAssignedUmpire(matchUpdates.umpireId.trim())
        : null;

    if (role === "admin" && typeof matchUpdates.umpireId === "string" && matchUpdates.umpireId.trim() && !nextAssignedUmpire) {
      return jsonError("Assigned umpire must be an existing umpire account.", 400);
    }

    const updateOperation: { $set?: Record<string, unknown>; $unset?: Record<string, string> } = {};

    if (Object.keys(matchUpdates).length > 0) {
      updateOperation.$set = { ...matchUpdates };
    }

    if ("umpireId" in matchUpdates) {
      const normalizedUmpireId = typeof matchUpdates.umpireId === "string" ? matchUpdates.umpireId.trim() : "";
      if (normalizedUmpireId) {
        updateOperation.$set = {
          ...(updateOperation.$set ?? {}),
          umpireId: normalizedUmpireId,
        };
      } else {
        if (updateOperation.$set) {
          delete updateOperation.$set.umpireId;
        }
        updateOperation.$unset = { ...(updateOperation.$unset ?? {}), umpireId: "" };
      }
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      params.id,
      updateOperation,
      { new: true } 
    ).lean();

    if (!updatedMatch) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Broadcast the full updated match state
    await pusherServer.trigger(`match-${params.id}`, "match-updated", updatedMatch);

    let createdEventPayload: Record<string, unknown> | null = null;

    if (undoEventId) {
      const deletedEvent = await Event.findOneAndDelete({ _id: undoEventId, matchId: params.id }).lean();
      if (deletedEvent) {
        await pusherServer.trigger(`match-${params.id}`, "event-removed", {
          eventId: deletedEvent._id.toString(),
        });
      }
    }

    if (eventLog) {
      const newEvent = await Event.create({
        matchId: params.id,
        frameNumber: updatedMatch.currentFrame || 1,
        player: eventLog.player || "System",
        eventType: eventLog.type === "score" ? "score_update" : (eventLog.type === "foul" ? "foul" : "system"),
        points: typeof eventLog.points === "string" ? parseInt(eventLog.points.replace(/[^0-9-]/g, '')) || 0 : eventLog.points,
        description: eventLog.action || "Match updated",
      });

      createdEventPayload = {
        id: newEvent._id.toString(),
        time: eventLog.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        player: eventLog.player || "System",
        action: eventLog.action || "Match updated",
        points: eventLog.points,
        type: eventLog.type
      };

      await pusherServer.trigger(`match-${params.id}`, "new-event", createdEventPayload);
    }

    // If an umpire update was provided, send them an email
    let mailSent = false;
    let mailError = null;

    const nextUmpireId =
      typeof (updateOperation.$set?.umpireId ?? "") === "string"
        ? String(updateOperation.$set?.umpireId ?? "")
        : "";

    if (nextUmpireId && nextUmpireId !== originalUmpireId) {
       const umpire = nextAssignedUmpire ?? await findAssignedUmpire(nextUmpireId);
       if (umpire?.email) {
          const mailResult = await sendMatchAssignmentEmail(
            umpire.email, 
            umpire.name || "Umpire", 
            updatedMatch.title, 
            new Date(updatedMatch.scheduledTime).toISOString()
          );
          mailSent = mailResult.success;
          if (!mailResult.success) {
            mailError = (mailResult.error as any)?.message || "Failed to send email";
          }
       }
    }

    const previousStatus = existingMatch.status;
    if (shouldNotifyFavoriteUsersOnStatusChange(previousStatus, updatedMatch.status)) {
      await notifyFavoriteUsersForLiveMatch(params.id);
    }

    return NextResponse.json({ 
      success: true, 
      match: updatedMatch,
      event: createdEventPayload,
      mailSent,
      mailError
    }, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("matches.update_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Match deletion is temporarily unavailable during maintenance mode.", 503);
    }

    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    const result = await runAdminDeleteMatchWorkflow(params.id, {
      deleteMatch: (id) => Match.findByIdAndDelete(id).lean(),
      deleteEvents: async (matchId) => {
        await Event.deleteMany({ matchId });
      },
      deleteChatMessages: async (matchId) => {
        await ChatMessage.deleteMany({ matchId });
      },
      createEvent: (input) => Event.create(input),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("matches.delete_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
