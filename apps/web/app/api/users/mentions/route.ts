export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../lib/models/User";
import { applyRateLimit, jsonError } from "../../../../lib/request";
import { logError } from "../../../../lib/logger";

function toMentionHandle(name: string, email: string) {
  const source = name?.trim() || email.split("@")[0] || "user";
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "user";
}

export async function GET(req: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(req, "mentions:search", 60, 60_000);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError("Unauthorized", 401);
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();

    const users = await User.find({}, { name: 1, email: 1, image: 1, role: 1 })
      .sort({ createdAt: -1 })
      .lean();

    const mentions = users
      .map((user: any) => ({
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        image: user.image || "",
        handle: toMentionHandle(user.name, user.email),
      }))
      .filter((user) =>
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.handle.includes(query),
      )
      .slice(0, 8);

    return NextResponse.json({ success: true, mentions }, { status: 200 });
  } catch (error) {
    logError("mentions.search_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
