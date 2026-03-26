export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import dbConnect from "../../../../../lib/mongodb";
import ChatMessage from "../../../../../lib/models/ChatMessage";
import { pusherServer } from "../../../../../lib/pusher";
import { logError } from "../../../../../lib/logger";
import { applyRateLimit, jsonError } from "../../../../../lib/request";
import { enforceTrustedOrigin } from "../../../../../lib/security";
import { isMaintenanceModeEnabled } from "../../../../../lib/settings";
import { sanitizeChatText } from "../../../../../lib/chat-moderation";
import { ValidationError, runPostChatMessageWorkflow } from "../../../../../lib/workflows/chat";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await props.params;
    
    // Fetch last 50 messages
    const messages = await ChatMessage.find({ matchId: params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
      
    return NextResponse.json({
      success: true,
      messages: messages
        .reverse()
        .map((message: any) => ({ ...message, text: sanitizeChatText(message.text || "") })),
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const trustedOriginResponse = enforceTrustedOrigin(req);
    if (trustedOriginResponse) {
      return trustedOriginResponse;
    }

    const maintenanceMode = await isMaintenanceModeEnabled();
    if (maintenanceMode) {
      return jsonError("Live chat is temporarily unavailable during maintenance mode.", 503);
    }

    await dbConnect();
    const params = await props.params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await applyRateLimit(
      req,
      "chat:post",
      12,
      30_000,
      (session.user as any).id || session.user.email || "anonymous",
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const result = await runPostChatMessageWorkflow(await req.json(), params.id, session.user as any, {
      createMessage: (input) => ChatMessage.create(input),
      deleteMessage: async () => undefined,
      trigger: async (matchId, eventName, payload) => {
        await pusherServer.trigger(`match-${matchId}`, eventName, payload);
      },
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonError(error.message, 400);
    }

    logError("chat.post_failed", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
