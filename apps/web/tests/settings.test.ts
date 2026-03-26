import test from "node:test";
import assert from "node:assert/strict";
import { validateSettingsInput } from "../lib/validation.ts";

test("validateSettingsInput constrains announcement length", () => {
  const result = validateSettingsInput({
    maintenanceMode: 1,
    allowRegistration: 0,
    globalAnnouncement: "Platform maintenance tonight",
  });

  assert.deepEqual(result, {
    maintenanceMode: true,
    allowRegistration: false,
    globalAnnouncement: "Platform maintenance tonight",
  });
});
