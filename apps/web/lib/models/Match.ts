import mongoose, { Schema, Document } from "mongoose";

export interface IMatch extends Document {
  title: string;
  playerA: string;
  playerB: string;
  format: string;
  totalFrames: number;
  framesToWin: number;
  scheduledTime: Date;
  venue?: string;
  umpireId?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  status: "scheduled" | "live" | "paused" | "finished";
  viewers: number;
  activeViewerSessions: Array<{
    token: string;
    lastSeenAt: Date;
  }>;
  activePlayer?: "A" | "B";

  // --- NEW SCORING FIELDS ---
  scoreA: number;
  scoreB: number;
  framesWonA: number;
  framesWonB: number;
  currentFrame: number;
  winner?: string;
}

const MatchSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    playerA: { type: String, required: true },
    playerB: { type: String, required: true },
    format: { type: String, required: true },
    totalFrames: { type: Number, required: true },
    framesToWin: { type: Number },
    scheduledTime: { type: Date, required: true },
    venue: { type: String },
    umpireId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    streamUrl: { type: String },
    thumbnailUrl: { type: String },
    status: { type: String, enum: ["scheduled", "live", "paused", "finished"], default: "scheduled" },
    viewers: { type: Number, default: 0 },
    activeViewerSessions: {
      type: [
        new Schema(
          {
            token: { type: String, required: true },
            lastSeenAt: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
      select: false,
    },
    activePlayer: { type: String, enum: ["A", "B"], default: "A" },

    // --- NEW SCORING FIELDS ---
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    framesWonA: { type: Number, default: 0 },
    framesWonB: { type: Number, default: 0 },
    currentFrame: { type: Number, default: 1 },
    winner: { type: String },
  },
  { timestamps: true }
);

// --- SCALABILITY INDICES ---
MatchSchema.index({ status: 1 });
MatchSchema.index({ scheduledTime: 1 });
MatchSchema.index({ status: 1, scheduledTime: 1 });

export default mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);
