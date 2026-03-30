import { SUBSCRIPTION_TIERS, normalizeSubscriptionTier } from "./subscriptions.ts";
import { schemaRules } from "./schemas.ts";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

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

  const normalized = requireTrimmedString(value, label, { maxLength: schemaRules.match.urlMaxLength });

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

function optionalUrlArray(value: unknown, label: string, maxItems = schemaRules.match.secondaryStreamMaxItems) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, maxItems)
    .map((entry) => optionalUrl(entry, label))
    .filter(Boolean);
}

function ensureScheduledTimeNotInPast(date: Date, label = "Scheduled time") {
  if (date.getTime() < Date.now()) {
    throw new ValidationError(`${label} cannot be in the past`);
  }

  return date;
}

export function validateRegistrationInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  const name = requireTrimmedString(payload.name, "Name", { maxLength: schemaRules.registration.nameMaxLength });
  const email = requireTrimmedString(payload.email, "Email", { maxLength: schemaRules.registration.emailMaxLength }).toLowerCase();
  const password = requireTrimmedString(payload.password, "Password", {
    minLength: schemaRules.registration.passwordMinLength,
    maxLength: schemaRules.registration.passwordMaxLength,
  });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Email must be valid");
  }

  return { name, email, password };
}

export function validateProfileUpdateInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  const name = payload.name
    ? requireTrimmedString(payload.name, "Name", { maxLength: schemaRules.registration.nameMaxLength })
    : undefined;
  const password = payload.password
    ? requireTrimmedString(payload.password, "Password", {
        minLength: schemaRules.registration.passwordMinLength,
        maxLength: schemaRules.registration.passwordMaxLength,
      })
    : undefined;
  const subscriptionTier =
    payload.subscriptionTier !== undefined
      ? requireEnum(payload.subscriptionTier, "Subscription tier", SUBSCRIPTION_TIERS)
      : undefined;
  const favoritePlayers = Array.isArray(payload.favoritePlayers)
    ? payload.favoritePlayers
        .map((player) =>
          requireTrimmedString(player, "Favorite player", { maxLength: schemaRules.profile.favoritePlayerMaxLength }),
        )
        .slice(0, schemaRules.profile.favoritePlayersMaxItems)
    : undefined;

  if (!name && !password && !subscriptionTier && !favoritePlayers) {
    throw new ValidationError("Nothing to update");
  }

  return { name, password, subscriptionTier, favoritePlayers };
}

export function validatePlayerProfileInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  const name = requireTrimmedString(payload.name, "Player name", { maxLength: schemaRules.playerProfile.nameMaxLength });
  const country = requireTrimmedString(payload.country, "Country", {
    maxLength: schemaRules.playerProfile.countryMaxLength,
  });
  const bio = payload.bio === undefined ? "" : optionalTrimmedString(payload.bio, { maxLength: schemaRules.playerProfile.bioMaxLength });

  let rank: number | undefined;
  if (payload.rank !== undefined && payload.rank !== null && payload.rank !== "") {
    rank = requirePositiveNumber(payload.rank, "Rank");
  }

  return { name, country, rank, bio };
}

export function validateSettingsInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;

  return {
    maintenanceMode: Boolean(payload.maintenanceMode),
    allowRegistration: Boolean(payload.allowRegistration),
    globalAnnouncement:
      payload.globalAnnouncement === undefined || payload.globalAnnouncement === null
        ? ""
        : optionalTrimmedString(payload.globalAnnouncement, { maxLength: schemaRules.settings.announcementMaxLength }),
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

  ensureScheduledTimeNotInPast(date);

  return {
    title: requireTrimmedString(payload.title, "Title", { maxLength: schemaRules.match.titleMaxLength }),
    playerA: requireTrimmedString(payload.playerA, "Player A", { maxLength: schemaRules.match.playerNameMaxLength }),
    playerB: requireTrimmedString(payload.playerB, "Player B", { maxLength: schemaRules.match.playerNameMaxLength }),
    format: requireTrimmedString(payload.format, "Format", { maxLength: schemaRules.match.formatMaxLength }),
    totalFrames,
    scheduledTime: date,
    venue: requireTrimmedString(payload.venue, "Venue", { maxLength: schemaRules.match.venueMaxLength }),
    streamUrl: optionalUrl(payload.streamUrl, "Stream URL"),
    secondaryStreamUrls: optionalUrlArray(payload.secondaryStreamUrls, "Secondary Stream URL"),
    vodUrl: optionalUrl(payload.vodUrl, "VOD URL"),
    thumbnailUrl: optionalUrl(payload.thumbnailUrl, "Thumbnail URL"),
    umpireId: requireTrimmedString(payload.umpireId, "Umpire"),
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
    updates.playerA = requireTrimmedString(payload.playerA, "Player A", { maxLength: schemaRules.match.playerNameMaxLength });
  }

  if (payload.playerB !== undefined) {
    updates.playerB = requireTrimmedString(payload.playerB, "Player B", { maxLength: schemaRules.match.playerNameMaxLength });
  }

  if (payload.title !== undefined) {
    updates.title = requireTrimmedString(payload.title, "Title", { maxLength: schemaRules.match.titleMaxLength });
  }

  if (payload.format !== undefined) {
    updates.format = requireTrimmedString(payload.format, "Format", { maxLength: schemaRules.match.formatMaxLength });
  }

  if (payload.venue !== undefined) {
    updates.venue = requireTrimmedString(payload.venue, "Venue", { maxLength: schemaRules.match.venueMaxLength });
  }

  if (payload.streamUrl !== undefined) {
    updates.streamUrl = optionalUrl(payload.streamUrl, "Stream URL");
  }

  if (payload.secondaryStreamUrls !== undefined) {
    updates.secondaryStreamUrls = optionalUrlArray(payload.secondaryStreamUrls, "Secondary Stream URL");
  }

  if (payload.vodUrl !== undefined) {
    updates.vodUrl = optionalUrl(payload.vodUrl, "VOD URL");
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
    updates.scheduledTime = ensureScheduledTimeNotInPast(date);
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
    updates.winner = optionalTrimmedString(payload.winner, { maxLength: schemaRules.match.playerNameMaxLength });
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
  const text = requireTrimmedString(payload.text, "Message", { maxLength: schemaRules.chat.maxLength });
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
    role: payload.role !== undefined ? requireEnum(payload.role, "Role", ["admin", "umpire", "user"]) : undefined,
    subscriptionTier:
      payload.subscriptionTier !== undefined
        ? normalizeSubscriptionTier(payload.subscriptionTier)
        : undefined,
  };
}

export function validateSubscriptionCheckoutInput(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;
  return {
    tier: requireEnum(payload.tier, "Subscription tier", schemaRules.subscriptionCheckout.allowedTiers),
  };
}
