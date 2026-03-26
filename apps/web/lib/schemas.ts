export const schemaRules = {
  registration: {
    nameMaxLength: 80,
    emailMaxLength: 120,
    passwordMinLength: 8,
    passwordMaxLength: 128,
  },
  profile: {
    favoritePlayersMaxItems: 12,
    favoritePlayerMaxLength: 80,
  },
  playerProfile: {
    nameMaxLength: 80,
    countryMaxLength: 80,
    bioMaxLength: 400,
  },
  settings: {
    announcementMaxLength: 280,
  },
  match: {
    titleMaxLength: 140,
    playerNameMaxLength: 80,
    formatMaxLength: 40,
    venueMaxLength: 120,
    urlMaxLength: 500,
    secondaryStreamMaxItems: 4,
  },
  chat: {
    maxLength: 500,
  },
  subscriptionCheckout: {
    allowedTiers: ["plus", "pro"] as const,
  },
} as const;
