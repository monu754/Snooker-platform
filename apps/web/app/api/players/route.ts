export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import PlayerProfile from "../../../lib/models/PlayerProfile";
import { applyRateLimit } from "../../../lib/request";
import { logError } from "../../../lib/logger";

export async function GET(req: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(req, "players:search", 90, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const country = (searchParams.get("country") || "").trim();
    const rank = searchParams.get("rank");

    const filters: Record<string, unknown> = {};

    if (q) {
      filters.$or = [
        { name: { $regex: q, $options: "i" } },
        { country: { $regex: q, $options: "i" } },
      ];
    }

    if (country) {
      filters.country = { $regex: `^${country}$`, $options: "i" };
    }

    if (rank) {
      filters.rank = Number(rank);
    }

    const players = await PlayerProfile.find(filters)
      .sort({ rank: 1, favoriteCount: -1, name: 1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, players }, { status: 200 });
  } catch (error) {
    logError("players.fetch_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
