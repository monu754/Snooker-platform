export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import dbConnect from "../../../../../../lib/mongodb";
import ChatMessage from "../../../../../../lib/models/ChatMessage";
import { pusherServer } from "../../../../../../lib/pusher";
import { logError } from "../../../../../../lib/logger";
import { applyRateLimit } from "../../../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../../../lib/security";
import { runDeleteChatMessageWorkflow } from "../../../../../../lib/workflows/chat";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; role?: string };
    const rateLimitResponse = await applyRateLimit(req, "chat:delete", 30, 60_000, user.id || user.role || "anonymous");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    const params = await props.params;
    const message = await ChatMessage.findById(params.messageId);
    const result = await runDeleteChatMessageWorkflow(params.id, params.messageId, user, message as any, {
      deleteMessage: async (messageId) => {
        await ChatMessage.findByIdAndDelete(messageId);
      },
      trigger: async (matchId, eventName, payload) => {
        await pusherServer.trigger(`match-${matchId}`, eventName, payload);
      },
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    logError("chat.delete_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
