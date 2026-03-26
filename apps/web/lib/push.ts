import webpush from "web-push";
import User from "./models/User.ts";
import Match from "./models/Match.ts";
import { logError, logInfo, logWarn } from "./logger.ts";
import { normalizePlayerName } from "./player-profiles.ts";
import { type StoredPushSubscription } from "./push-subscription.ts";

type LiveMatchNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

function getPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

let pushConfigured = false;

function ensurePushConfigured() {
  const config = getPushConfig();
  if (!config) {
    return null;
  }

  if (!pushConfigured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    pushConfigured = true;
  }

  return config;
}

export function getPublicVapidKey() {
  return getPushConfig()?.publicKey || "";
}

export function isPushConfigured() {
  return Boolean(getPushConfig());
}

export async function sendPushNotification(subscription: StoredPushSubscription, payload: LiveMatchNotificationPayload) {
  if (!ensurePushConfigured()) {
    throw new Error("Push delivery is not configured.");
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

export async function notifyFavoriteUsersForLiveMatch(matchId: string) {
  const config = ensurePushConfigured();
  if (!config) {
    logWarn("push.favorite_live.skipped_unconfigured", { matchId });
    return;
  }

  const match = await Match.findById(matchId).select("+favoriteAlertUserIds").lean<{
    _id: { toString(): string };
    playerA: string;
    playerB: string;
    status: string;
    favoriteAlertUserIds?: string[];
  } | null>();

  if (!match || match.status !== "live") {
    return;
  }

  const trackedUsers = new Set(match.favoriteAlertUserIds || []);
  const candidateUsers = await User.find(
    {
      favoritePlayers: { $in: [match.playerA, match.playerB] },
      "pushSubscriptions.0": { $exists: true },
    },
    { favoritePlayers: 1, pushSubscriptions: 1 },
  ).lean<Array<{
    _id: { toString(): string };
    favoritePlayers?: string[];
    pushSubscriptions?: StoredPushSubscription[];
  }>>();

  const normalizedLivePlayers = new Set([normalizePlayerName(match.playerA), normalizePlayerName(match.playerB)]);
  const deliveredUserIds: string[] = [];

  for (const user of candidateUsers) {
    const userId = user._id.toString();
    if (trackedUsers.has(userId)) {
      continue;
    }

    const matchingFavorite = (user.favoritePlayers || []).find((player) =>
      normalizedLivePlayers.has(normalizePlayerName(player)),
    );

    if (!matchingFavorite || !user.pushSubscriptions?.length) {
      continue;
    }

    const payload: LiveMatchNotificationPayload = {
      title: `${matchingFavorite} is live`,
      body: `${match.playerA} vs ${match.playerB} is now available to watch.`,
      url: `/watch/${match._id.toString()}`,
      tag: `favorite-live-${match._id.toString()}`,
    };

    const validSubscriptions: StoredPushSubscription[] = [];

    for (const subscription of user.pushSubscriptions) {
      try {
        await sendPushNotification(subscription, payload);
        validSubscriptions.push(subscription);
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode && ![404, 410].includes(statusCode)) {
          validSubscriptions.push(subscription);
          logError("push.favorite_live.send_failed", error, { matchId, userId });
        }
      }
    }

    if (validSubscriptions.length !== user.pushSubscriptions.length) {
      await User.updateOne({ _id: userId }, { $set: { pushSubscriptions: validSubscriptions } });
    }

    if (validSubscriptions.length > 0) {
      deliveredUserIds.push(userId);
    }
  }

  if (deliveredUserIds.length > 0) {
    await Match.updateOne(
      { _id: matchId },
      { $addToSet: { favoriteAlertUserIds: { $each: deliveredUserIds } } },
    );

    logInfo("push.favorite_live.sent", {
      matchId,
      deliveredUsers: deliveredUserIds.length,
    });
  }
}
