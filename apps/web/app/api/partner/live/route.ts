export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match";

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  await dbConnect();
  const matches = await Match.find(
    { status: { $in: ["live", "paused", "scheduled"] } },
    {
      title: 1,
      playerA: 1,
      playerB: 1,
      status: 1,
      scheduledTime: 1,
      scoreA: 1,
      scoreB: 1,
      framesWonA: 1,
      framesWonB: 1,
      currentFrame: 1,
      streamUrl: 1,
      viewers: 1,
    },
  )
    .sort({ scheduledTime: 1 })
    .lean();

  return withCors(NextResponse.json({ success: true, matches }, { status: 200 }));
}
