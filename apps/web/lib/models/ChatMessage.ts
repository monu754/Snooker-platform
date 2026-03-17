import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  matchId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userImage?: string;
  text: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

// --- SCALABILITY INDICES ---
ChatMessageSchema.index({ matchId: 1, createdAt: -1 });
ChatMessageSchema.index({ matchId: 1 });

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
