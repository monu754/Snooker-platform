type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function writeLog(level: LogLevel, message: string, payload?: LogPayload) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(payload ?? {}),
  };

  const serialized = JSON.stringify(entry);

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
