import test from "node:test";
import assert from "node:assert/strict";
import {
  runAdminCreateMatchWorkflow,
  runAdminDeleteMatchWorkflow,
} from "../../lib/workflows/admin-match-management.ts";

function buildDeps(overrides?: Partial<Parameters<typeof runAdminCreateMatchWorkflow>[1]>) {
  return {
    areRegisteredPlayers: async () => true,
    findAssignedUmpire: async () => null,
    createMatch: async (input: Record<string, unknown>) => ({ _id: "match-1", ...input }),
    createEvent: async () => undefined,
    deleteMatch: async (id: string) => ({ _id: id }),
    deleteEvents: async () => undefined,
    deleteChatMessages: async () => undefined,
    sendMatchAssignmentEmail: async () => ({ success: true }),
    ...overrides,
  };
}

function createPayload(overrides?: Partial<Record<string, unknown>>) {
  return {
    title: "Final Table",
    playerA: "Player One",
    playerB: "Player Two",
    format: "best-of-7",
    totalFrames: 7,
    scheduledTime: "2026-03-26T12:00:00.000Z",
    venue: "Main Arena",
    ...overrides,
  };
}

test("admin match workflow rejects duplicate players", async () => {
  const result = await runAdminCreateMatchWorkflow(
    createPayload({ playerB: "Player One" }),
    buildDeps(),
  );

  assert.equal(result.status, 400);
});

test("admin match workflow rejects unknown players", async () => {
  const result = await runAdminCreateMatchWorkflow(
    createPayload(),
    buildDeps({ areRegisteredPlayers: async () => false }),
  );

  assert.equal(result.status, 400);
});

test("admin match workflow rejects past scheduled matches", async () => {
  await assert.rejects(
    () =>
      runAdminCreateMatchWorkflow(
        createPayload({ scheduledTime: "2020-03-26T12:00:00.000Z" }),
        buildDeps(),
      ),
    /cannot be in the past/i,
  );
});

test("admin match workflow creates a match and emails a newly assigned umpire", async () => {
  let emailed = false;

  const result = await runAdminCreateMatchWorkflow(
    createPayload({ umpireId: "ump-1" }),
    buildDeps({
      findAssignedUmpire: async () => ({ email: "umpire@example.com", name: "Assigned Umpire" }),
      sendMatchAssignmentEmail: async () => {
        emailed = true;
        return { success: true };
      },
    }),
  );

  assert.equal(result.status, 201);
  assert.equal((result.body as { mailSent?: boolean }).mailSent, true);
  assert.equal(emailed, true);
});

test("admin match workflow deletes the match and related resources", async () => {
  let deletedEvents = false;
  let deletedChats = false;

  const result = await runAdminDeleteMatchWorkflow("match-1", {
    deleteMatch: async () => ({ _id: "match-1" }),
    deleteEvents: async () => {
      deletedEvents = true;
    },
    deleteChatMessages: async () => {
      deletedChats = true;
    },
    createEvent: async () => undefined,
  });

  assert.equal(result.status, 200);
  assert.equal(deletedEvents, true);
  assert.equal(deletedChats, true);
});
