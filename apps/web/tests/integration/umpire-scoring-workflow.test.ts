import test from "node:test";
import assert from "node:assert/strict";
import {
  runFoulWorkflow,
  runFrameEndWorkflow,
  runScoreUpdateWorkflow,
} from "../../lib/workflows/umpire-scoring.ts";

function buildDeps() {
  return {
    async findMatch() {
      return { _id: "match-1", umpireId: "ump-1" };
    },
    async createEvent(input: Record<string, unknown>) {
      return { _id: "event-1", ...input };
    },
    async trigger() {
      return undefined;
    },
  };
}

const umpire = { id: "ump-1", role: "umpire" };

test("umpire scoring workflow rejects wrong umpire assignment", async () => {
  const result = await runScoreUpdateWorkflow(
    { matchId: "match-1", player: "A", points: 7, frameNumber: 1, actionDescription: "Red + Black" },
    { id: "ump-2", role: "umpire" },
    buildDeps(),
  );

  assert.equal(result.status, 403);
});

test("umpire scoring workflow records score updates for the assigned umpire", async () => {
  const result = await runScoreUpdateWorkflow(
    { matchId: "match-1", player: "A", points: 7, frameNumber: 1, actionDescription: "Red + Black" },
    umpire,
    buildDeps(),
  );

  assert.equal(result.status, 200);
  assert.equal((result.body as { success?: boolean }).success, true);
});

test("umpire scoring workflow records fouls", async () => {
  const result = await runFoulWorkflow(
    { matchId: "match-1", player: "B", penalty: 4, frameNumber: 2 },
    umpire,
    buildDeps(),
  );

  assert.equal(result.status, 200);
  assert.equal((result.body as { message?: string }).message, "Foul recorded successfully");
});

test("umpire scoring workflow records frame end events", async () => {
  const result = await runFrameEndWorkflow(
    { matchId: "match-1", winner: "A", frameNumber: 3 },
    umpire,
    buildDeps(),
  );

  assert.equal(result.status, 200);
  assert.equal((result.body as { message?: string }).message, "Frame ended successfully");
});
