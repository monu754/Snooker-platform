export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import PlayerProfile from "../../../../lib/models/PlayerProfile";
import { ensurePlayerProfiles, normalizePlayerName } from "../../../../lib/player-profiles";
import { applyRateLimit, jsonError } from "../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../lib/security";
import { ValidationError, validatePlayerProfileInput } from "../../../../lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return jsonError("Unauthorized", 401);
  }

  await dbConnect();
  const players = await PlayerProfile.find({}).sort({ rank: 1, name: 1 }).lean();
  return NextResponse.json({ success: true, players }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const rateLimitResponse = await applyRateLimit(req, "admin:players:create", 20, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    await dbConnect();
    const { name, country, rank, bio } = validatePlayerProfileInput(await req.json());
    const normalizedName = normalizePlayerName(name);
    const existingPlayer = await PlayerProfile.findOne({ normalizedName }).lean();

    if (existingPlayer) {
      return jsonError("A player with this name already exists", 409);
    }

    await ensurePlayerProfiles([name]);
    const player = await PlayerProfile.findOneAndUpdate(
      { normalizedName },
      {
        $set: {
          name,
          country,
          rank,
          bio,
        },
      },
      { new: true },
    );

    return NextResponse.json({ success: true, player }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    return jsonError("Failed to create player", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const rateLimitResponse = await applyRateLimit(req, "admin:players:update", 40, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    await dbConnect();
    const payload = (await req.json()) as { _id?: string };
    const playerId = typeof payload._id === "string" ? payload._id.trim() : "";
    if (!playerId) {
      return jsonError("Player id is required", 400);
    }

    const { name, country, rank, bio } = validatePlayerProfileInput(payload);
    const normalizedName = normalizePlayerName(name);
    const conflictingPlayer = await PlayerProfile.findOne({
      normalizedName,
      _id: { $ne: playerId },
    }).lean();

    if (conflictingPlayer) {
      return jsonError("Another player already uses this name", 409);
    }

    const player = await PlayerProfile.findByIdAndUpdate(
      playerId,
      {
        $set: {
          name,
          normalizedName,
          country,
          rank,
          bio,
        },
      },
      { new: true },
    ).lean();

    if (!player) {
      return jsonError("Player not found", 404);
    }

    return NextResponse.json({ success: true, player }, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    return jsonError("Failed to update player", 500);
  }
}
