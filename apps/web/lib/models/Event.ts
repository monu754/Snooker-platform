import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  matchId?: string;
  frameNumber: number;
  player: string;
  eventType: string;
  points: number;
  description: string;
  category: "admin" | "match";
}

const EventSchema: Schema = new Schema(
  {
    matchId: { type: String, required: false },
    frameNumber: { type: Number, required: true, default: 0 },
    player: { type: String, required: true },
    eventType: { type: String, required: true },
    points: { type: Number, required: true, default: 0 },
    description: { type: String, required: true },
    category: { type: String, enum: ["admin", "match"], default: "match" },
  },
  { timestamps: true }
);

// In development, hot-reloading can keep the old model in memory.
// We force it to re-register if the category field is missing from the existing model's schema.
if (mongoose.models.Event && !mongoose.models.Event.schema.paths.category) {
  delete mongoose.models.Event;
}

export default mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);