import test from "node:test";
import assert from "node:assert/strict";

import { enforceTrustedOrigin, getSecurityHeaders, validateImageUpload } from "../lib/security.ts";

test("trusted origin guard allows same-origin requests", () => {
  const req = new Request("http://localhost:3000/api/example", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
    },
  });

  assert.equal(enforceTrustedOrigin(req), null);
});

test("trusted origin guard blocks cross-site requests", () => {
  const req = new Request("http://localhost:3000/api/example", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "https://evil.example",
    },
  });

  const response = enforceTrustedOrigin(req);
  assert.ok(response);
  assert.equal(response?.status, 403);
});

test("image upload validator rejects non-image uploads", () => {
  const file = new File(["hello"], "payload.txt", { type: "text/plain" });
  assert.throws(() => validateImageUpload(file));
});

test("security headers include opener and frame protections", () => {
  const headers = getSecurityHeaders();
  const byKey = Object.fromEntries(headers.map((header) => [header.key, header.value]));

  assert.equal(byKey["Cross-Origin-Opener-Policy"], "same-origin");
  assert.equal(byKey["X-Frame-Options"], "DENY");
  assert.ok(byKey["Content-Security-Policy"]);
  assert.match(byKey["Content-Security-Policy"]!, /frame-ancestors 'none'/);
});
