const ACTIVE_VIEWER_TTL_MS = 45_000;

type ViewerSession = {
  token: string;
  lastSeenAt: Date | string;
};

type MatchPresenceShape = {
  activeViewerSessions?: ViewerSession[];
  viewers?: number;
  markModified?: (path: string) => void;
};

export function normalizeViewerSessions(match: MatchPresenceShape, now = new Date()) {
  const cutoff = now.getTime() - ACTIVE_VIEWER_TTL_MS;
  const sessions = (match.activeViewerSessions || []).filter((session) => {
    const lastSeenAt = new Date(session.lastSeenAt).getTime();
    return Boolean(session.token) && Number.isFinite(lastSeenAt) && lastSeenAt >= cutoff;
  });

  match.activeViewerSessions = sessions;
  match.viewers = sessions.length;
  match.markModified?.("activeViewerSessions");
  return sessions;
}

export function upsertViewerSession(match: MatchPresenceShape, token: string, now = new Date()) {
  const sessions = normalizeViewerSessions(match, now);
  const existing = sessions.find((session) => session.token === token);

  if (existing) {
    existing.lastSeenAt = now;
  } else {
    sessions.push({ token, lastSeenAt: now });
  }

  match.activeViewerSessions = sessions;
  match.viewers = sessions.length;
  match.markModified?.("activeViewerSessions");
  return sessions.length;
}

export function removeViewerSession(match: MatchPresenceShape, token: string, now = new Date()) {
  const sessions = normalizeViewerSessions(match, now).filter((session) => session.token !== token);
  match.activeViewerSessions = sessions;
  match.viewers = sessions.length;
  match.markModified?.("activeViewerSessions");
  return sessions.length;
}

export function getActiveViewerTtlMs() {
  return ACTIVE_VIEWER_TTL_MS;
}
