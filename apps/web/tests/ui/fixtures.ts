import type { Page } from "@playwright/test";

type MockSessionUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  subscriptionTier?: string;
};

type MockSettings = {
  maintenanceMode?: boolean;
  allowRegistration?: boolean;
  globalAnnouncement?: string;
  googleAuthEnabled?: boolean;
};

export async function mockSession(page: Page, user?: MockSessionUser | null) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        user
          ? {
              user: {
                id: user.id || "user-1",
                name: user.name || "Viewer One",
                email: user.email || "viewer@example.com",
                role: user.role || "user",
                subscriptionTier: user.subscriptionTier || "free",
              },
              expires: "2099-01-01T00:00:00.000Z",
            }
          : null,
      ),
    });
  });
}

export async function mockSettings(page: Page, settings: MockSettings = {}) {
  await page.route("**/api/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        maintenanceMode: false,
        allowRegistration: true,
        globalAnnouncement: "",
        googleAuthEnabled: true,
        ...settings,
      }),
    });
  });
}
