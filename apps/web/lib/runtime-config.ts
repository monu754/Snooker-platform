export type UploadStorageMode = "local" | "external" | "object";

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getConfiguredUploadStorageMode(): UploadStorageMode {
  const configured = (process.env.UPLOAD_STORAGE_MODE || "").trim().toLowerCase();

  if (configured === "external" || configured === "object") {
    return configured;
  }

  return "local";
}

export function isLocalUploadAllowedInProduction() {
  return process.env.ALLOW_LOCAL_UPLOADS_IN_PRODUCTION === "true";
}

export function getUploadConfigurationIssues() {
  const issues: string[] = [];
  const mode = getConfiguredUploadStorageMode();

  if (isProductionRuntime() && mode === "local" && !isLocalUploadAllowedInProduction()) {
    issues.push("Production uploads are still using local disk storage.");
  }

  if (mode === "external" || mode === "object") {
    const endpoint = process.env.UPLOAD_OBJECT_ENDPOINT || process.env.UPLOAD_EXTERNAL_ENDPOINT;
    const publicBaseUrl =
      process.env.UPLOAD_OBJECT_PUBLIC_BASE_URL || process.env.UPLOAD_EXTERNAL_PUBLIC_BASE_URL;

    if (!endpoint) {
      issues.push("External/object upload endpoint is not configured.");
    }

    if (!publicBaseUrl) {
      issues.push("External/object upload public base URL is not configured.");
    }
  }

  return issues;
}

export function getRuntimeConfigurationIssues() {
  const issues: string[] = [];

  if (!process.env.MONGODB_URI) {
    issues.push("MONGODB_URI is missing.");
  }

  if (!process.env.NEXTAUTH_SECRET) {
    issues.push("NEXTAUTH_SECRET is missing.");
  }

  if (!process.env.NEXTAUTH_URL) {
    issues.push("NEXTAUTH_URL is missing.");
  } else if (isProductionRuntime()) {
    try {
      const parsed = new URL(process.env.NEXTAUTH_URL);
      if (parsed.protocol !== "https:") {
        issues.push("NEXTAUTH_URL should use HTTPS in production.");
      }
    } catch {
      issues.push("NEXTAUTH_URL is not a valid URL.");
    }
  }

  if (
    (process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_SECRET) ||
    (!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  ) {
    issues.push("Google auth requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    issues.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.");
  }

  if (!process.env.VAPID_PRIVATE_KEY) {
    issues.push("VAPID_PRIVATE_KEY is missing.");
  }

  if (!process.env.VAPID_SUBJECT) {
    issues.push("VAPID_SUBJECT is missing.");
  }

  issues.push(...getUploadConfigurationIssues());

  return issues;
}
