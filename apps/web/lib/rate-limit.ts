type RateLimitWindow = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitWindow>;
type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  driver: "memory" | "mongo";
};

declare global {
  var __snookerRateLimitStore: RateLimitStore | undefined;
}

import mongoose from "mongoose";
import { incrementMetric } from "./metrics.ts";

function getStore() {
  if (!globalThis.__snookerRateLimitStore) {
    globalThis.__snookerRateLimitStore = new Map();
  }

  return globalThis.__snookerRateLimitStore;
}

let rateLimitIndexesReady = false;

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

function consumeInMemoryRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextWindow = { count: 1, resetAt: now + windowMs };
    store.set(key, nextWindow);
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      resetAt: nextWindow.resetAt,
      driver: "memory",
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
    driver: "memory",
  };
}

async function getMongoRateLimitCollection() {
  const { default: dbConnect } = await import("./mongodb.ts");
  await dbConnect();

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB connection is not available for rate limiting.");
  }

  const collection = database.collection("rate_limits");
  if (!rateLimitIndexesReady) {
    await Promise.all([
      collection.createIndex({ key: 1 }, { unique: true }),
      collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    rateLimitIndexesReady = true;
  }

  return collection;
}

async function consumeMongoRateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const nextResetAt = new Date(now.getTime() + windowMs);
  const collection = await getMongoRateLimitCollection();

  const result = await collection.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          createdAt: { $ifNull: ["$createdAt", now] },
          updatedAt: now,
          count: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $type: "$resetAt" }, "missing"] },
                  { $lte: ["$resetAt", now] },
                ],
              },
              1,
              { $add: [{ $ifNull: ["$count", 0] }, 1] },
            ],
          },
          resetAt: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $type: "$resetAt" }, "missing"] },
                  { $lte: ["$resetAt", now] },
                ],
              },
              nextResetAt,
              "$resetAt",
            ],
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  const entry = (result as { value?: { count?: number; resetAt?: Date } }).value;
  const count = entry?.count ?? 1;
  const resetAt = entry?.resetAt instanceof Date ? entry.resetAt.getTime() : nextResetAt.getTime();

  return {
    allowed: count <= limit,
    remaining: Math.max(limit - count, 0),
    resetAt,
    driver: "mongo",
  };
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  if (process.env.RATE_LIMIT_DRIVER === "memory") {
    return consumeInMemoryRateLimit(options);
  }

  try {
    return await consumeMongoRateLimit(options);
  } catch {
    incrementMetric(`rate_limit_fallbacks_total.${extractNamespace(options.key)}`);
    return consumeInMemoryRateLimit(options);
  }
}

function extractNamespace(key: string) {
  const firstColon = key.indexOf(":");
  if (firstColon === -1) {
    return key;
  }

  return key.slice(0, firstColon) || key;
}
