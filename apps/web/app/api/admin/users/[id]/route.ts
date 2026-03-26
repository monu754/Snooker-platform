import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import dbConnect from "../../../../../lib/mongodb";
import User from "../../../../../lib/models/User";
import Event from "../../../../../lib/models/Event";
import { logError } from "../../../../../lib/logger";
import { jsonError } from "../../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../../lib/security";
import { ValidationError, validateUserRoleInput } from "../../../../../lib/validation";
import { sanitizeStoredSubscriptionTier } from "../../../../../lib/access";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string; id?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const { role, subscriptionTier } = validateUserRoleInput(await req.json());

    await dbConnect();

    // Prevent admin from demoting themselves (optional safeguard)
    if (id === sessionUser?.id) {
       return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
    }

    if (!role && !subscriptionTier) {
      return jsonError("No valid updates provided", 400);
    }

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nextRole = role ?? currentUser.role;
    const nextTier = subscriptionTier !== undefined
      ? sanitizeStoredSubscriptionTier(nextRole, subscriptionTier)
      : role !== undefined
        ? sanitizeStoredSubscriptionTier(nextRole, currentUser.subscriptionTier)
        : undefined;

    const user = await User.findByIdAndUpdate(
      id,
      {
        ...(nextRole ? { role: nextRole } : {}),
        ...(nextTier !== undefined ? { subscriptionTier: nextTier } : {}),
      },
      { new: true },
    );
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log the update
    await Event.create({
      player: "System",
      eventType: "user_update",
      points: 0,
      description: `User access updated for ${user.name}${nextRole ? ` role=${nextRole}` : ""}${nextTier ? ` tier=${nextTier}` : ""}`,
      category: "admin",
      frameNumber: 0
    });

    return NextResponse.json(user);
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("admin.users.update_role_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { role?: string; id?: string } | undefined;
    if (!session || sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    await dbConnect();

    // Prevent admin from deleting themselves
    if (id === sessionUser?.id) {
       return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
    }

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log the deletion
    await Event.create({
      player: "System",
      eventType: "user_deleted",
      points: 0,
      description: `User Deleted: ${user.name} (${user.email})`,
      category: "admin",
      frameNumber: 0
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error: unknown) {
    logError("admin.users.delete_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
