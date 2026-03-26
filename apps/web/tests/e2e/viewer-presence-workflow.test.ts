import test from "node:test";
import assert from "node:assert/strict";
import {
  runViewerHeartbeatWorkflow,
  runViewerReleaseWorkflow,
} from "../../lib/workflows/viewer-presence.ts";

function buildMatch() {
  return {
    activeViewerSessions: [],
    viewers: 0,
    async save() {
      return undefined;
    },
    markModified() {
      return undefined;
    },
  };
}

function buildDeps() {
  return {
    async trigger() {
      return undefined;
    },
    async broadcastViewerStats() {
      return undefined;
    },
  };
}

test("viewer presence workflow heartbeats then releases the same viewer token", async () => {
  const match = buildMatch();

  const heartbeat = await runViewerHeartbeatWorkflow("match-1", "viewer-token-1", match as any, buildDeps());
  const release = await runViewerReleaseWorkflow("match-1", "viewer-token-1", match as any, buildDeps());

  assert.equal(heartbeat.status, 200);
  assert.equal((heartbeat.body as { viewers?: number }).viewers, 1);
  assert.equal(release.status, 200);
  assert.equal((release.body as { viewers?: number }).viewers, 0);
});

test("viewer presence workflow rejects missing viewer tokens", async () => {
  const result = await runViewerHeartbeatWorkflow("match-1", null, buildMatch() as any, buildDeps());
  assert.equal(result.status, 400);
});
