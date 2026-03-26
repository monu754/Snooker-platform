import test from "node:test";
import assert from "node:assert/strict";
import {
  runDeleteChatMessageWorkflow,
  runPostChatMessageWorkflow,
} from "../../lib/workflows/chat.ts";

function buildDeps() {
  return {
    async createMessage(input: Record<string, unknown>) {
      return {
        _id: "msg-1",
        userId: String(input.userId || "user-1"),
        userName: input.userName,
        userImage: input.userImage,
        text: input.text,
        createdAt: new Date("2026-03-26T12:00:00.000Z"),
      };
    },
    async deleteMessage() {
      return undefined;
    },
    async trigger() {
      return undefined;
    },
  };
}

test("chat workflow requires authentication to post", async () => {
  const result = await runPostChatMessageWorkflow(
    { text: "Hello table" },
    "match-1",
    null,
    buildDeps(),
  );

  assert.equal(result.status, 401);
});

test("chat workflow sanitizes and stores valid messages", async () => {
  const result = await runPostChatMessageWorkflow(
    { text: "You are a fuck player" },
    "match-1",
    { id: "user-1", role: "user", name: "Viewer" },
    buildDeps(),
  );

  assert.equal(result.status, 201);
  assert.match(String((result.body as any).message.text), /\*+/);
});

test("chat delete workflow allows admins to moderate", async () => {
  const result = await runDeleteChatMessageWorkflow(
    "match-1",
    "msg-1",
    { id: "admin-1", role: "admin" },
    { _id: "msg-1", userId: "user-1", matchId: "match-1" },
    buildDeps(),
  );

  assert.equal(result.status, 200);
});

test("chat delete workflow rejects unrelated viewers", async () => {
  const result = await runDeleteChatMessageWorkflow(
    "match-1",
    "msg-1",
    { id: "user-2", role: "user" },
    { _id: "msg-1", userId: "user-1", matchId: "match-1" },
    buildDeps(),
  );

  assert.equal(result.status, 403);
});
