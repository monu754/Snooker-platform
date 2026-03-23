export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const BLOCKED_CHAT_PATTERNS = [
  /\b(?:fag|faggot|dyke|retard(?:ed)?|nigg(?:a|er)|kike|spic|chink|paki)\b/i,
  /\b(?:kill yourself|kys|go die|heil hitler|white power)\b/i,
  /\b(?:rape you|rapist|slut|whore|bitch)\b/i,
];

function hasExcessiveSpam(text: string) {
  if (/(.)\1{7,}/i.test(text)) {
    return true;
  }

  const upperChars = text.replace(/[^A-Z]/g, "").length;
  const letterChars = text.replace(/[^A-Za-z]/g, "").length;
  if (letterChars >= 12 && upperChars / letterChars > 0.85) {
    return true;
  }

  const repeatedTokens = text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return repeatedTokens.length >= 4 && new Set(repeatedTokens).size <= Math.ceil(repeatedTokens.length / 3);
}

function assertSafeChatMessage(text: string) {
  if (BLOCKED_CHAT_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new ValidationError("Message contains abusive or hateful content");
  }

  if (hasExcessiveSpam(text)) {
    throw new ValidationError("Message looks like spam");
  }
}

function requireTrimmedString(value: unknown, label: string, options?: { maxLength?: number; minLength?: number }) {
  if (typeof value !== "string") {
    throw new ValidationError(`${label} is required`);
  }

  const normalized = value.trim();
  const minLength = options?.minLength ?? 1;

  if (normalized.length < minLength) {
    throw new ValidationError(`${label} is required`);
  }

  if (options?.maxLength && normalized.length > options.maxLength) {
    throw new ValidationError(`${label} must be ${options.maxLength} characters or less`);
  }

  return normalized;
}

function optionalTrimmedString(value: unknown, options?: { maxLength?: number }) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return requireTrimmedString(value, "Field", { maxLength: options?.maxLength });
}

function requireEnum<T extends string>(value: unknown, label: string, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(`${label} is invalid`);
  }

  return value as T;
}

function requirePositiveNumber(value: unknown, label: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ValidationError(`${label} is invalid`);
  }

  return numeric;
}

function requireNonNegativeNumber(value: unknown, label: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new ValidationError(`${label} is invalid`);
  }

  return numeric;
}

function optionalUrl(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const normalized = requireTrimmedString(value, label, { maxLength: 500 });

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("invalid");
    }
  } catch {
    throw new ValidationError(`${label} must be a valid URL`);
  }

  return normalized;
}

export function validateRegistrationInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  const name = requireTrimmedString(payload.name, "Name", { maxLength: 80 });
  const email = requireTrimmedString(payload.email, "Email", { maxLength: 120 }).toLowerCase();
  const password = requireTrimmedString(payload.password, "Password", { minLength: 8, maxLength: 128 });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Email must be valid");
  }

  return { name, email, password };
}

export function validateProfileUpdateInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  const name = payload.name ? requireTrimmedString(payload.name, "Name", { maxLength: 80 }) : undefined;
  const password = payload.password
    ? requireTrimmedString(payload.password, "Password", { minLength: 8, maxLength: 128 })
    : undefined;

  if (!name && !password) {
    throw new ValidationError("Nothing to update");
  }

  return { name, password };
}

export function validateSettingsInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  return {
    maintenanceMode: Boolean(payload.maintenanceMode),
    allowRegistration: Boolean(payload.allowRegistration),
    globalAnnouncement:
      payload.globalAnnouncement === undefined || payload.globalAnnouncement === null
        ? ""
        : optionalTrimmedString(payload.globalAnnouncement, { maxLength: 280 }),
  };
}

export function validateMatchInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  const totalFrames = requirePositiveNumber(payload.totalFrames, "Total frames");
  const scheduledTime = requireTrimmedString(payload.scheduledTime, "Scheduled time");

  const date = new Date(scheduledTime);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("Scheduled time is invalid");
  }

  return {
    title: requireTrimmedString(payload.title, "Title", { maxLength: 140 }),
    playerA: requireTrimmedString(payload.playerA, "Player A", { maxLength: 80 }),
    playerB: requireTrimmedString(payload.playerB, "Player B", { maxLength: 80 }),
    format: requireTrimmedString(payload.format, "Format", { maxLength: 40 }),
    totalFrames,
    scheduledTime: date,
    venue: requireTrimmedString(payload.venue, "Venue", { maxLength: 120 }),
    streamUrl: optionalUrl(payload.streamUrl, "Stream URL"),
    thumbnailUrl: optionalUrl(payload.thumbnailUrl, "Thumbnail URL"),
    umpireId:
      payload.umpireId && typeof payload.umpireId === "string" ? payload.umpireId.trim() : "",
  };
}

export function validateMatchPatchInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  let undoEventId: string | undefined;

  if (payload.status !== undefined) {
    updates.status = requireEnum(payload.status, "Status", ["scheduled", "live", "paused", "finished"]);
  }

  if (payload.activePlayer !== undefined) {
    updates.activePlayer = requireEnum(payload.activePlayer, "Active player", ["A", "B"]);
  }

  if (payload.playerA !== undefined) {
    updates.playerA = requireTrimmedString(payload.playerA, "Player A", { maxLength: 80 });
  }

  if (payload.playerB !== undefined) {
    updates.playerB = requireTrimmedString(payload.playerB, "Player B", { maxLength: 80 });
  }

  if (payload.title !== undefined) {
    updates.title = requireTrimmedString(payload.title, "Title", { maxLength: 140 });
  }

  if (payload.format !== undefined) {
    updates.format = requireTrimmedString(payload.format, "Format", { maxLength: 40 });
  }

  if (payload.venue !== undefined) {
    updates.venue = requireTrimmedString(payload.venue, "Venue", { maxLength: 120 });
  }

  if (payload.streamUrl !== undefined) {
    updates.streamUrl = optionalUrl(payload.streamUrl, "Stream URL");
  }

  if (payload.thumbnailUrl !== undefined) {
    updates.thumbnailUrl = optionalUrl(payload.thumbnailUrl, "Thumbnail URL");
  }

  if (payload.umpireId !== undefined) {
    updates.umpireId = typeof payload.umpireId === "string" ? payload.umpireId.trim() : "";
  }

  if (payload.scheduledTime !== undefined) {
    const scheduledTime = requireTrimmedString(payload.scheduledTime, "Scheduled time");
    const date = new Date(scheduledTime);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError("Scheduled time is invalid");
    }
    updates.scheduledTime = date;
  }

  for (const numericField of ["scoreA", "scoreB", "framesWonA", "framesWonB"] as const) {
    if (payload[numericField] !== undefined) {
      updates[numericField] = requireNonNegativeNumber(payload[numericField], numericField);
    }
  }

  for (const numericField of ["currentFrame", "totalFrames", "framesToWin"] as const) {
    if (payload[numericField] !== undefined) {
      updates[numericField] = requirePositiveNumber(payload[numericField], numericField);
    }
  }

  if (payload.winner !== undefined) {
    updates.winner = optionalTrimmedString(payload.winner, { maxLength: 80 });
  }

  if (payload.undoEventId !== undefined) {
    undoEventId = requireTrimmedString(payload.undoEventId, "Undo event", { maxLength: 120 });
  }

  const eventLog = payload.eventLog;

  if (Object.keys(updates).length === 0 && !eventLog && !undoEventId) {
    throw new ValidationError("No valid updates provided");
  }

  return {
    updates,
    undoEventId,
    eventLog: eventLog as
      | {
          player?: string;
          type?: "score" | "foul" | "system";
          points?: number | string;
          action?: string;
          time?: string;
        }
      | undefined,
  };
}

export function validateChatMessageInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;
  const text = requireTrimmedString(payload.text, "Message", { maxLength: 500 });
  assertSafeChatMessage(text);
  return { text };
}

export function validateUmpireCreationInput(input: unknown) {
  const base = validateRegistrationInput(input);
  return base;
}

export function validateUserRoleInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;
  return {
    role: requireEnum(payload.role, "Role", ["admin", "umpire", "user"]),
  };
}
