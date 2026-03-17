export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import dbConnect from "../../../../../lib/mongodb";
import ChatMessage from "../../../../../lib/models/ChatMessage";
import { pusherServer } from "../../../../../lib/pusher";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await props.params;
    
    // Fetch last 50 messages
    const messages = await ChatMessage.find({ matchId: params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
      
    return NextResponse.json({ success: true, messages: messages.reverse() }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await props.params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }

    const newMessage = await ChatMessage.create({
      matchId: params.id,
      userId: (session.user as any).id,
      userName: session.user.name || "Anonymous",
      userImage: session.user.image,
      text: text.trim()
    });

    const msgData = {
      _id: newMessage._id.toString(),
      matchId: params.id,
      userId: newMessage.userId.toString(),
      userName: newMessage.userName,
      userImage: newMessage.userImage,
      text: newMessage.text,
      createdAt: newMessage.createdAt
    };

    // Broadcast to the channel match-{id}
    await pusherServer.trigger(`match-${params.id}`, "new-chat-message", msgData);

    return NextResponse.json({ success: true, message: msgData }, { status: 201 });
  } catch (error) {
    console.error("Chat Post Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
