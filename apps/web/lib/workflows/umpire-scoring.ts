type UmpireSessionUser = {
  id?: string;
  role?: string;
};

type MatchAssignment = {
  umpireId?: string | { toString(): string };
};

type ScoringEvent = {
  _id?: string | { toString(): string };
};

type UmpireScoringDeps = {
  findMatch(matchId: string): Promise<(MatchAssignment & Record<string, unknown>) | null>;
  createEvent(input: Record<string, unknown>): Promise<ScoringEvent>;
  trigger(matchId: string, eventName: string, payload: Record<string, unknown>): Promise<void>;
};

function isAssignedUmpire(match: MatchAssignment, userId: string | undefined) {
  if (!userId) {
    return false;
  }

  return match.umpireId?.toString() === userId;
}

export async function runScoreUpdateWorkflow(
  payload: Record<string, unknown>,
  user: UmpireSessionUser | null,
  deps: UmpireScoringDeps,
) {
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (user.role !== "umpire") {
    return { status: 403, body: { error: "Forbidden: Only umpires can update scores" } };
  }

  const { matchId, player, points, frameNumber, actionDescription } = payload;
  if (!matchId || !player || points === undefined || !frameNumber) {
    return { status: 400, body: { error: "Missing required fields" } };
  }

  const match = await deps.findMatch(String(matchId));
  if (!match) {
    return { status: 404, body: { error: "Match not found" } };
  }

  if (!isAssignedUmpire(match, user.id)) {
    return { status: 403, body: { error: "Forbidden: You are not the umpire for this match" } };
  }

  const event = await deps.createEvent({
    matchId,
    frameNumber,
    player,
    eventType: "score_update",
    points,
    description: actionDescription,
  });

  await deps.trigger(String(matchId), "score-update", {
    player,
    points,
    description: actionDescription,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });

  return { status: 200, body: { success: true, event } };
}

export async function runFoulWorkflow(
  payload: Record<string, unknown>,
  user: UmpireSessionUser | null,
  deps: UmpireScoringDeps,
) {
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (user.role !== "umpire") {
    return { status: 403, body: { error: "Only umpires can add fouls" } };
  }

  const { matchId, player, penalty, frameNumber } = payload;
  if (!matchId || !player || !penalty || !frameNumber) {
    return { status: 400, body: { error: "Missing required fields" } };
  }

  const match = await deps.findMatch(String(matchId));
  if (!match) {
    return { status: 404, body: { error: "Match not found" } };
  }

  if (!isAssignedUmpire(match, user.id)) {
    return { status: 403, body: { error: "You are not assigned to umpire this match" } };
  }

  const event = await deps.createEvent({
    matchId,
    frameNumber,
    player,
    eventType: "foul",
    points: penalty,
    description: `Foul by Player ${player} (${penalty} pts to opponent)`,
  });

  await deps.trigger(String(matchId), "foul-update", {
    player,
    penalty,
    description: "Foul (Miss)",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });

  return { status: 200, body: { success: true, message: "Foul recorded successfully", event } };
}

export async function runFrameEndWorkflow(
  payload: Record<string, unknown>,
  user: UmpireSessionUser | null,
  deps: Pick<UmpireScoringDeps, "findMatch" | "createEvent">,
) {
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (user.role !== "umpire") {
    return { status: 403, body: { error: "Only umpires can end frames" } };
  }

  const { matchId, winner, frameNumber } = payload;
  if (!matchId || !winner || !frameNumber) {
    return { status: 400, body: { error: "Missing required fields" } };
  }

  const match = await deps.findMatch(String(matchId));
  if (!match) {
    return { status: 404, body: { error: "Match not found" } };
  }

  if (!isAssignedUmpire(match, user.id)) {
    return { status: 403, body: { error: "You are not assigned to umpire this match" } };
  }

  const event = await deps.createEvent({
    matchId,
    frameNumber,
    player: winner,
    eventType: "frame_end",
    points: 0,
    description: `Player ${winner} won Frame ${frameNumber}`,
  });

  return { status: 200, body: { success: true, message: "Frame ended successfully", event } };
}
