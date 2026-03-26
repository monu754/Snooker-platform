export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Match from "../../../lib/models/Match";
import { generateBracket } from "../../../lib/brackets";
import { applyRateLimit, jsonError } from "../../../lib/request";

export async function GET() {
  await dbConnect();
  const matches = await Match.find({ status: { $in: ["scheduled", "live", "paused"] } }, { playerA: 1, playerB: 1 }).lean();
  const entrants = [...new Set(matches.flatMap((match: any) => [match.playerA, match.playerB]).filter(Boolean))];
  return NextResponse.json({ success: true, bracket: generateBracket(entrants) }, { status: 200 });
}

export async function POST(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, "brackets:generate", 60, 60_000);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const payload = (await req.json()) as { entrants?: string[] };
  const entrants = Array.isArray(payload.entrants) ? payload.entrants : [];

  if (entrants.length < 2) {
    return jsonError("At least two entrants are required to generate a bracket", 400);
  }

  return NextResponse.json({ success: true, bracket: generateBracket(entrants) }, { status: 200 });
}
