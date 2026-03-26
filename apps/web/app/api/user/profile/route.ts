import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { authOptions } from "../../../../lib/auth";
import { logError } from "../../../../lib/logger";
import { jsonError } from "../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../lib/security";
import { isMaintenanceModeEnabled } from "../../../../lib/settings";
import { ValidationError, validateProfileUpdateInput } from "../../../../lib/validation";
import { findRegisteredPlayersByNames, syncFavoriteCounts } from "../../../../lib/player-profiles";
import { canPurchasePremium, sanitizeStoredSubscriptionTier } from "../../../../lib/access";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { email?: string } | undefined;

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne(
      { email: sessionUser?.email },
      { name: 1, email: 1, role: 1, image: 1, createdAt: 1, updatedAt: 1, subscriptionTier: 1, favoritePlayers: 1 },
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image || "",
        subscriptionTier: sanitizeStoredSubscriptionTier(user.role, user.subscriptionTier),
        favoritePlayers: user.favoritePlayers || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: unknown) {
    logError("profile.fetch_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Profile updates are temporarily unavailable during maintenance mode.", 503);
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { email?: string; role?: string } | undefined;

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, password, subscriptionTier, favoritePlayers } = validateProfileUpdateInput(await req.json());

    await dbConnect();

    if (favoritePlayers) {
      const registeredPlayers = await findRegisteredPlayersByNames(favoritePlayers);
      const registeredNames = new Set(
        registeredPlayers.map((player) => String((player as { name?: string }).name || "").trim().toLowerCase()),
      );
      const invalidFavorites = favoritePlayers.filter(
        (favorite) => !registeredNames.has(favorite.trim().toLowerCase()),
      );

      if (invalidFavorites.length > 0) {
        return jsonError("Favorite players must be selected from the registered player directory.", 400);
      }

      await syncFavoriteCounts();
    }

    const updateData: {
      name?: string;
      subscriptionTier?: "free" | "plus" | "pro";
      favoritePlayers?: string[];
      password?: string;
    } = {};
    if (name) updateData.name = name;
    const sessionRole = sessionUser?.role || "user";
    if (subscriptionTier && canPurchasePremium(sessionRole)) {
      updateData.subscriptionTier = sanitizeStoredSubscriptionTier(sessionRole, subscriptionTier);
    }
    if (favoritePlayers) {
      updateData.favoritePlayers = [...new Set(favoritePlayers)];
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: sessionUser?.email },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        subscriptionTier: sanitizeStoredSubscriptionTier(updatedUser.role, updatedUser.subscriptionTier),
        favoritePlayers: updatedUser.favoritePlayers,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("profile.update_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
