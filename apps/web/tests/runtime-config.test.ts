import test from "node:test";
import assert from "node:assert/strict";
import {
  getConfiguredUploadStorageMode,
  getRuntimeConfigurationIssues,
  getUploadConfigurationIssues,
  isGoogleAuthConfigured,
} from "../lib/runtime-config.ts";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

test("runtime config flags missing critical env vars", () => {
  const previous = {
    MONGODB_URI: process.env.MONGODB_URI,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  delete process.env.MONGODB_URI;
  delete process.env.NEXTAUTH_SECRET;
  delete process.env.NEXTAUTH_URL;

  const issues = getRuntimeConfigurationIssues();

  assert.ok(issues.includes("MONGODB_URI is missing."));
  assert.ok(issues.includes("NEXTAUTH_SECRET is missing."));
  assert.ok(issues.includes("NEXTAUTH_URL is missing."));

  restoreEnv("MONGODB_URI", previous.MONGODB_URI);
  restoreEnv("NEXTAUTH_SECRET", previous.NEXTAUTH_SECRET);
  restoreEnv("NEXTAUTH_URL", previous.NEXTAUTH_URL);
});

test("upload config requires endpoint metadata for external/object storage", () => {
  const previous = {
    UPLOAD_STORAGE_MODE: process.env.UPLOAD_STORAGE_MODE,
    UPLOAD_OBJECT_ENDPOINT: process.env.UPLOAD_OBJECT_ENDPOINT,
    UPLOAD_EXTERNAL_ENDPOINT: process.env.UPLOAD_EXTERNAL_ENDPOINT,
    UPLOAD_OBJECT_PUBLIC_BASE_URL: process.env.UPLOAD_OBJECT_PUBLIC_BASE_URL,
    UPLOAD_EXTERNAL_PUBLIC_BASE_URL: process.env.UPLOAD_EXTERNAL_PUBLIC_BASE_URL,
  };

  process.env.UPLOAD_STORAGE_MODE = "object";
  delete process.env.UPLOAD_OBJECT_ENDPOINT;
  delete process.env.UPLOAD_EXTERNAL_ENDPOINT;
  delete process.env.UPLOAD_OBJECT_PUBLIC_BASE_URL;
  delete process.env.UPLOAD_EXTERNAL_PUBLIC_BASE_URL;

  assert.equal(getConfiguredUploadStorageMode(), "object");

  const issues = getUploadConfigurationIssues();
  assert.ok(issues.includes("External/object upload endpoint is not configured."));
  assert.ok(issues.includes("External/object upload public base URL is not configured."));

  restoreEnv("UPLOAD_STORAGE_MODE", previous.UPLOAD_STORAGE_MODE);
  restoreEnv("UPLOAD_OBJECT_ENDPOINT", previous.UPLOAD_OBJECT_ENDPOINT);
  restoreEnv("UPLOAD_EXTERNAL_ENDPOINT", previous.UPLOAD_EXTERNAL_ENDPOINT);
  restoreEnv("UPLOAD_OBJECT_PUBLIC_BASE_URL", previous.UPLOAD_OBJECT_PUBLIC_BASE_URL);
  restoreEnv("UPLOAD_EXTERNAL_PUBLIC_BASE_URL", previous.UPLOAD_EXTERNAL_PUBLIC_BASE_URL);
});

test("runtime config flags insecure auth url and partial google auth setup", () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };

  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  process.env.NEXTAUTH_URL = "http://snookerstream.test";
  process.env.GOOGLE_CLIENT_ID = "client-id-only";
  delete process.env.GOOGLE_CLIENT_SECRET;

  const issues = getRuntimeConfigurationIssues();

  assert.ok(issues.includes("NEXTAUTH_URL should use HTTPS in production."));
  assert.ok(issues.includes("Google auth requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."));
  assert.equal(isGoogleAuthConfigured(), false);

  restoreEnv("NODE_ENV", previous.NODE_ENV);
  restoreEnv("NEXTAUTH_URL", previous.NEXTAUTH_URL);
  restoreEnv("GOOGLE_CLIENT_ID", previous.GOOGLE_CLIENT_ID);
  restoreEnv("GOOGLE_CLIENT_SECRET", previous.GOOGLE_CLIENT_SECRET);
});
