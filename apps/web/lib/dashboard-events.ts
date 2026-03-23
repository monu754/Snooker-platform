import Match from "./models/Match";
import { pusherServer } from "./pusher";

export async function broadcastViewerStats(matchId: string, matchViewers: number) {
  const liveMatches = await Match.find({ status: "live" }, { viewers: 1 }).lean();
  const activeViewers = liveMatches.reduce((sum, match: any) => sum + (match.viewers || 0), 0);

  await pusherServer.trigger("admin-dashboard", "viewer-stats-updated", {
    matchId,
    matchViewers,
    activeViewers,
  });
}
