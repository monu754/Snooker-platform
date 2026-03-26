import mongoose, { Schema, Document } from "mongoose";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "../subscriptions";

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  password?: string; // <-- NEW
  role: "user" | "admin" | "umpire";
  subscriptionTier: SubscriptionTier;
  favoritePlayers: string[];
  pushSubscriptions: Array<{
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
    createdAt: Date;
    updatedAt: Date;
  }>;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    password: { type: String, select: false }, // <-- NEW (select: false protects it from normal queries)
    role: { type: String, enum: ["user", "admin", "umpire"], default: "user" },
    subscriptionTier: { type: String, enum: SUBSCRIPTION_TIERS, default: "free" },
    favoritePlayers: { type: [String], default: [] },
    pushSubscriptions: {
      type: [
        new Schema(
          {
            endpoint: { type: String, required: true },
            expirationTime: { type: Number, default: null },
            keys: {
              p256dh: { type: String, required: true },
              auth: { type: String, required: true },
            },
            createdAt: { type: Date, required: true, default: Date.now },
            updatedAt: { type: Date, required: true, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
