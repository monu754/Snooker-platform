import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    // Security: Only Umpires and Admins can access this
    if (!session || (session.user as any)?.role !== "umpire") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const umpireId = (session.user as any).id;

    // Fetch matches specifically assigned to this umpire
    const matches = await Match.find({ umpireId: umpireId }).sort({ scheduledTime: 1 }).lean();

    return NextResponse.json({ success: true, matches }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch umpire matches:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}