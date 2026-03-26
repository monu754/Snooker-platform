import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { sanitizeStoredSubscriptionTier } from "../../../../lib/access";
import { logError } from "../../../../lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch all users, excluding passwords
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    return NextResponse.json(
      users.map((user) => {
        const plainUser = typeof user.toObject === "function" ? user.toObject() : user;
        return {
          ...plainUser,
          subscriptionTier: sanitizeStoredSubscriptionTier(plainUser.role, plainUser.subscriptionTier),
        };
      }),
    );
  } catch (error) {
    logError("admin.users.fetch_failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
