import mongoose, { Document, Schema } from "mongoose";

export interface IPlayerProfile extends Document {
  name: string;
  normalizedName: string;
  country: string;
  rank?: number;
  bio?: string;
  favoriteCount: number;
}

const PlayerProfileSchema = new Schema<IPlayerProfile>(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true, trim: true },
    country: { type: String, default: "", trim: true },
    rank: { type: Number },
    bio: { type: String, default: "", trim: true },
    favoriteCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PlayerProfileSchema.index({ country: 1, rank: 1 });

export default mongoose.models.PlayerProfile ||
  mongoose.model<IPlayerProfile>("PlayerProfile", PlayerProfileSchema);
