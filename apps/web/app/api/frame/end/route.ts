import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import dbConnect from "../../../../lib/mongodb";
import Match from "../../../../lib/models/Match";
import Event from "../../../../lib/models/Event";
import { logError } from "../../../../lib/logger";
import { enforceTrustedOrigin } from "../../../../lib/security";
import { runFrameEndWorkflow } from "../../../../lib/workflows/umpire-scoring";

export async function POST(req: Request) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const role = user?.role;

    if (role !== "umpire") {
      return NextResponse.json({ error: "Only umpires can end frames" }, { status: 403 });
    }

    await dbConnect();

    const result = await runFrameEndWorkflow(await req.json(), user, {
      findMatch: async (matchId) => Match.findById(matchId).lean() as any,
      createEvent: (input) => Event.create(input),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("umpire.frame_end.failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
