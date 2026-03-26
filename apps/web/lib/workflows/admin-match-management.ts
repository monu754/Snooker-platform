import { ValidationError, validateMatchInput } from "../validation.ts";

export type AdminMatchWorkflowDeps = {
  areRegisteredPlayers(players: string[]): Promise<boolean>;
  findAssignedUmpire(id: string): Promise<{ email?: string; name?: string } | null>;
  createMatch(input: Record<string, unknown>): Promise<{ _id: string | { toString(): string } } & Record<string, any>>;
  createEvent(input: Record<string, unknown>): Promise<unknown>;
  deleteMatch(id: string): Promise<({ _id: string | { toString(): string } } & Record<string, any>) | null>;
  deleteEvents(matchId: string): Promise<void>;
  deleteChatMessages(matchId: string): Promise<void>;
  sendMatchAssignmentEmail?(email: string, name: string, title: string, isoDate: string): Promise<{ success: boolean; error?: unknown }>;
};

export async function runAdminCreateMatchWorkflow(
  payload: unknown,
  deps: AdminMatchWorkflowDeps,
) {
  const {
    title,
    playerA,
    playerB,
    format,
    totalFrames,
    scheduledTime,
    venue,
    streamUrl,
    secondaryStreamUrls,
    vodUrl,
    thumbnailUrl,
    umpireId,
  } = validateMatchInput(payload);

  if (playerA === playerB) {
    return { status: 400, body: { error: "Player A and Player B must be different registered players." } };
  }

  const playersRegistered = await deps.areRegisteredPlayers([playerA, playerB]);
  if (!playersRegistered) {
    return { status: 400, body: { error: "Both match players must be created in the player directory before scheduling a match." } };
  }

  const assignedUmpire = umpireId ? await deps.findAssignedUmpire(umpireId) : null;
  if (umpireId && !assignedUmpire) {
    return { status: 400, body: { error: "Assigned umpire must be an existing umpire account." } };
  }

  const framesToWin = Math.floor(Number(totalFrames) / 2) + 1;
  const matchData: Record<string, unknown> = {
    title,
    playerA,
    playerB,
    format,
    totalFrames: Number(totalFrames),
    framesToWin,
    scheduledTime,
    venue,
    streamUrl: streamUrl || "",
    secondaryStreamUrls: secondaryStreamUrls || [],
    vodUrl: vodUrl || "",
    thumbnailUrl: thumbnailUrl || "",
    status: "scheduled",
  };

  if (umpireId && umpireId !== "") {
    matchData.umpireId = umpireId;
  }

  const newMatch = await deps.createMatch(matchData);

  await deps.createEvent({
    matchId: newMatch._id,
    frameNumber: 0,
    player: "System",
    eventType: "system_alert",
    points: 0,
    description: `Match Created: ${title} scheduled for ${new Date(scheduledTime).toLocaleDateString()}`,
    category: "admin",
  });

  let mailSent = false;
  let mailError: string | null = null;

  if (assignedUmpire?.email && deps.sendMatchAssignmentEmail) {
    const result = await deps.sendMatchAssignmentEmail(
      assignedUmpire.email,
      assignedUmpire.name || "Umpire",
      title,
      scheduledTime.toISOString(),
    );
    mailSent = result.success;
    if (!result.success) {
      mailError = (result.error as { message?: string } | undefined)?.message || "Failed to send email";
    }
  }

  return { status: 201, body: { success: true, match: newMatch, mailSent, mailError } };
}

export async function runAdminDeleteMatchWorkflow(
  matchId: string,
  deps: Pick<AdminMatchWorkflowDeps, "deleteMatch" | "deleteEvents" | "deleteChatMessages" | "createEvent">,
) {
  const deletedMatch = await deps.deleteMatch(matchId);
  if (!deletedMatch) {
    return { status: 404, body: { error: "Match not found" } };
  }

  await Promise.all([
    deps.deleteEvents(matchId),
    deps.deleteChatMessages(matchId),
  ]);

  await deps.createEvent({
    player: "System",
    eventType: "match_deleted",
    points: 0,
    description: `Match Deleted (ID: ${matchId}) by Admin`,
    category: "admin",
    frameNumber: 0,
  });

  return { status: 200, body: { success: true } };
}

export { ValidationError };
