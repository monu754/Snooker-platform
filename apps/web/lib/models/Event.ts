import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  matchId: string;
  frameNumber: number;
  player: string;
  eventType: string;
  points: number;
  description: string;
}

const EventSchema: Schema = new Schema(
  {
    matchId: { type: String, required: true },
    frameNumber: { type: Number, required: true },
    player: { type: String, required: true },
    eventType: { type: String, required: true },
    points: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);