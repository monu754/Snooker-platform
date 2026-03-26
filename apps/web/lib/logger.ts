type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;
import { incrementMetric } from "./metrics.ts";

function writeLog(level: LogLevel, message: string, payload?: LogPayload) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(payload ?? {}),
  };

  const serialized = JSON.stringify(entry);
  const alertWebhookUrl = process.env.ALERT_WEBHOOK_URL;
  incrementMetric(`logs_total.${level}`);

  if (alertWebhookUrl && (level === "error" || level === "warn")) {
    queueMicrotask(() => {
      fetch(alertWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
      }).catch(() => {});
    });
  }

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logInfo(message: string, payload?: LogPayload) {
  writeLog("info", message, payload);
}

export function logWarn(message: string, payload?: LogPayload) {
  writeLog("warn", message, payload);
}

export function logError(message: string, error: unknown, payload?: LogPayload) {
  const normalizedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: error };

  writeLog("error", message, {
    ...payload,
    error: normalizedError,
  });
}
