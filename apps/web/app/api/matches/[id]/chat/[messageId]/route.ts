export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import dbConnect from "../../../../../../lib/mongodb";
import ChatMessage from "../../../../../../lib/models/ChatMessage";
import { pusherServer } from "../../../../../../lib/pusher";
import { logError } from "../../../../../../lib/logger";
import { applyRateLimit } from "../../../../../../lib/request";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; role?: string };
    const rateLimitResponse = applyRateLimit(req, "chat:delete", 30, 60_000, user.id || user.role || "anonymous");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();
    const params = await props.params;
    const message = await ChatMessage.findById(params.messageId);

    if (!message || message.matchId.toString() !== params.id) {
      return NextResponse.json({ success: true, alreadyDeleted: true }, { status: 200 });
    }

    const isOwner = message.userId.toString() === user.id;
    const canModerate = (user.role || "") === "admin" || isOwner;

    if (!canModerate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ChatMessage.findByIdAndDelete(params.messageId);
    await pusherServer.trigger(`match-${params.id}`, "chat-message-deleted", {
      messageId: params.messageId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logError("chat.delete_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
