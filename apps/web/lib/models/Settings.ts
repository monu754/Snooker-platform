import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  maintenanceMode: boolean;
  globalAnnouncement: string;
  allowRegistration: boolean;
}

const SettingsSchema: Schema = new Schema(
  {
    maintenanceMode: { type: Boolean, default: false },
    globalAnnouncement: { type: String, default: "" },
    allowRegistration: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
