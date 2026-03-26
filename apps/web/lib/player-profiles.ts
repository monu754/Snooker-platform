import PlayerProfile from "./models/PlayerProfile";

export function normalizePlayerName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function ensurePlayerProfiles(names: string[]) {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];

  await Promise.all(
    uniqueNames.map(async (name) => {
      const normalizedName = normalizePlayerName(name);
      await PlayerProfile.findOneAndUpdate(
        { normalizedName },
        {
          $setOnInsert: {
            name,
            normalizedName,
          },
        },
        { upsert: true, new: true },
      );
    }),
  );
}

export async function findRegisteredPlayersByNames(names: string[]) {
  const normalizedNames = [...new Set(names.map((name) => normalizePlayerName(name)).filter(Boolean))];
  if (normalizedNames.length === 0) {
    return [];
  }

  return PlayerProfile.find({ normalizedName: { $in: normalizedNames } }).lean();
}

export async function areRegisteredPlayers(names: string[]) {
  const registeredPlayers = await findRegisteredPlayersByNames(names);
  const registered = new Set(
    registeredPlayers.map((player) => normalizePlayerName(String((player as { name?: string }).name || ""))),
  );

  return names.every((name) => registered.has(normalizePlayerName(name)));
}

export async function syncFavoriteCounts() {
  const User = (await import("./models/User")).default;
  const users = await User.find({}, { favoritePlayers: 1 }).lean();
  const counts = new Map<string, number>();

  for (const user of users as Array<{ favoritePlayers?: string[] }>) {
    for (const favorite of user.favoritePlayers || []) {
      const normalized = normalizePlayerName(favorite);
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  await PlayerProfile.updateMany({}, { $set: { favoriteCount: 0 } });

  await Promise.all(
    Array.from(counts.entries()).map(([normalizedName, favoriteCount]) =>
      PlayerProfile.findOneAndUpdate({ normalizedName }, { $set: { favoriteCount } }),
    ),
  );
}
