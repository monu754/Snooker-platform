export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import dbConnect from "../../../../../lib/mongodb";
import PlayerProfile from "../../../../../lib/models/PlayerProfile";
import { normalizePlayerName } from "../../../../../lib/player-profiles";
import { applyRateLimit, jsonError } from "../../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../../lib/security";
import { ValidationError, validatePlayerProfileInput } from "../../../../../lib/validation";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string } | undefined)?.role !== "admin") {
    return null;
  }

  return session;
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await dbConnect();
  const params = await props.params;
  const player = await PlayerProfile.findById(params.id).lean();
  if (!player) {
    return jsonError("Player not found", 404);
  }

  return NextResponse.json({ success: true, player }, { status: 200 });
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const rateLimitResponse = await applyRateLimit(req, "admin:players:update_by_id", 40, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    const params = await props.params;
    const { name, country, rank, bio } = validatePlayerProfileInput(await req.json());
    const normalizedName = normalizePlayerName(name);

    const conflictingPlayer = await PlayerProfile.findOne({
      normalizedName,
      _id: { $ne: params.id },
    }).lean();

    if (conflictingPlayer) {
      return jsonError("Another player already uses this name", 409);
    }

    const player = await PlayerProfile.findByIdAndUpdate(
      params.id,
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
