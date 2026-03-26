import test from "node:test";
import assert from "node:assert/strict";
import { runRegistrationWorkflow } from "../../lib/workflows/registration.ts";

test("registration workflow blocks maintenance mode", async () => {
  const result = await runRegistrationWorkflow(
    { name: "Viewer", email: "viewer@example.com", password: "supersecure123" },
    { maintenanceMode: true, allowRegistration: true },
    {
      findExistingUser: async () => null,
      createUser: async () => ({ _id: "unused" }),
    },
  );

  assert.equal(result.status, 503);
});

test("registration workflow blocks disabled registration", async () => {
  const result = await runRegistrationWorkflow(
    { name: "Viewer", email: "viewer@example.com", password: "supersecure123" },
    { maintenanceMode: false, allowRegistration: false },
    {
      findExistingUser: async () => null,
      createUser: async () => ({ _id: "unused" }),
    },
  );

  assert.equal(result.status, 403);
});

test("registration workflow rejects duplicate users", async () => {
  const result = await runRegistrationWorkflow(
    { name: "Viewer", email: "viewer@example.com", password: "supersecure123" },
    { maintenanceMode: false, allowRegistration: true },
    {
      findExistingUser: async () => ({ _id: "existing-user" }),
      createUser: async () => ({ _id: "unused" }),
    },
  );

  assert.equal(result.status, 400);
});

test("registration workflow creates a hashed user record on success", async () => {
  let createdPayload: { name: string; email: string; password: string } | undefined;

  const result = await runRegistrationWorkflow(
    { name: " Viewer ", email: "VIEWER@example.com", password: "supersecure123" },
    { maintenanceMode: false, allowRegistration: true },
    {
      findExistingUser: async () => null,
      createUser: async (input) => {
        createdPayload = input;
        return { _id: "new-user-id" };
      },
      hashPassword: async () => "hashed-password",
    },
  );

  assert.equal(result.status, 201);
  assert.equal(createdPayload?.email, "viewer@example.com");
  assert.equal(createdPayload?.password, "hashed-password");
});
