import { ValidationError, validateChatMessageInput } from "../validation.ts";
import { sanitizeChatText } from "../chat-moderation.ts";

type ChatSessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  image?: string | null;
};

type ChatMessageShape = {
  _id?: string | { toString(): string };
  userId: string | { toString(): string };
  matchId?: string | { toString(): string };
};

type ChatWorkflowDeps = {
  createMessage(input: Record<string, unknown>): Promise<ChatMessageShape & Record<string, any>>;
  deleteMessage(messageId: string): Promise<void>;
  trigger(matchId: string, eventName: string, payload: Record<string, unknown>): Promise<void>;
};

export async function runPostChatMessageWorkflow(
  payload: unknown,
  matchId: string,
  user: ChatSessionUser | null,
  deps: ChatWorkflowDeps,
) {
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const { text } = validateChatMessageInput(payload);
  const sanitizedText = sanitizeChatText(text.trim());

  const newMessage = await deps.createMessage({
    matchId,
    userId: user.id,
    userName: user.name || "Anonymous",
    userImage: user.image,
    text: sanitizedText,
  });

  const body = {
    _id: newMessage._id?.toString() || "",
    matchId,
    userId: newMessage.userId.toString(),
    userName: String((newMessage as any).userName || user.name || "Anonymous"),
    userImage: (newMessage as any).userImage ?? user.image,
    text: String((newMessage as any).text || sanitizedText),
    createdAt: (newMessage as any).createdAt,
  };

  await deps.trigger(matchId, "new-chat-message", body);
  return { status: 201, body: { success: true, message: body } };
}

export async function runDeleteChatMessageWorkflow(
  matchId: string,
  messageId: string,
  user: ChatSessionUser | null,
  message: ChatMessageShape | null,
  deps: Pick<ChatWorkflowDeps, "deleteMessage" | "trigger">,
) {
  if (!user) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (!message || message.matchId?.toString() !== matchId) {
    return { status: 200, body: { success: true, alreadyDeleted: true } };
  }

  const isOwner = message.userId.toString() === user.id;
  const canModerate = (user.role || "") === "admin" || isOwner;
  if (!canModerate) {
    return { status: 403, body: { error: "Forbidden" } };
  }

  await deps.deleteMessage(messageId);
  await deps.trigger(matchId, "chat-message-deleted", { messageId });
  return { status: 200, body: { success: true } };
}

export { ValidationError };
