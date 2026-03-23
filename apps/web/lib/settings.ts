import dbConnect from "./mongodb";
import Settings from "./models/Settings";

export type PublicSettings = {
  maintenanceMode: boolean;
  globalAnnouncement: string;
  allowRegistration: boolean;
};

const defaultSettings: PublicSettings = {
  maintenanceMode: false,
  globalAnnouncement: "",
  allowRegistration: true,
};

export async function getPlatformSettings(): Promise<PublicSettings> {
  await dbConnect();

  const settings = await Settings.findOne(
    {},
    { maintenanceMode: 1, globalAnnouncement: 1, allowRegistration: 1, _id: 0 },
  ).lean<PublicSettings | null>();

  return settings ?? defaultSettings;
}

export async function ensureSettingsDocument() {
  await dbConnect();

  let settings = await Settings.findOne({});
  if (!settings) {
    settings = await Settings.create(defaultSettings);
  }

  return settings;
}

export async function isMaintenanceModeEnabled() {
  const settings = await getPlatformSettings();
  return settings.maintenanceMode;
}

export async function isRegistrationAllowed() {
  const settings = await getPlatformSettings();
  return settings.allowRegistration;
}
