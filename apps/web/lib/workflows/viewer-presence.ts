import { removeViewerSession, upsertViewerSession } from "../viewer-presence.ts";

type MatchPresenceEntity = {
  save(): Promise<void>;
};

type ViewerPresenceDeps = {
  trigger(matchId: string, eventName: string, payload: Record<string, unknown>): Promise<void>;
  broadcastViewerStats(matchId: string, viewers: number): Promise<void>;
};

export async function runViewerHeartbeatWorkflow(
  matchId: string,
  viewerToken: string | null,
  match: (MatchPresenceEntity & Record<string, unknown>) | null,
  deps: ViewerPresenceDeps,
) {
  if (!viewerToken) {
    return { status: 400, body: { error: "Viewer token is required" } };
  }

  if (!match) {
    return { status: 404, body: { error: "Match not found" } };
  }

  const viewers = upsertViewerSession(match as any, viewerToken);
  await match.save();
  await deps.trigger(matchId, "viewer-update", { viewers });
  await deps.broadcastViewerStats(matchId, viewers);

  return { status: 200, body: { success: true, viewers } };
}

export async function runViewerReleaseWorkflow(
  matchId: string,
  viewerToken: string | null,
  match: (MatchPresenceEntity & Record<string, unknown>) | null,
  deps: ViewerPresenceDeps,
) {
  if (!viewerToken) {
    return { status: 400, body: { error: "Viewer token is required" } };
  }

  if (!match) {
    return { status: 404, body: { error: "Match not found" } };
  }

  const viewers = removeViewerSession(match as any, viewerToken);
  await match.save();
  await deps.trigger(matchId, "viewer-update", { viewers });
  await deps.broadcastViewerStats(matchId, viewers);

  return { status: 200, body: { success: true, viewers } };
}
