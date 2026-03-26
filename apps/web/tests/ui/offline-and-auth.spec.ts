import { expect, test } from "@playwright/test";
import { mockSession, mockSettings } from "./fixtures";

test("network banner appears when the browser goes offline", async ({ page, context }) => {
  await mockSession(page, null);
  await mockSettings(page);
  await page.route("**/api/matches", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ matches: [] }),
    });
  });

  await page.goto("/");
  await context.setOffline(true);

  await expect(page.getByText(/You are offline\./i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Offline help" })).toBeVisible();

  await context.setOffline(false);
});

test("cached analytics snapshot is shown when the live request fails", async ({ page }) => {
  await mockSession(page, null);
  await mockSettings(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "snooker.offline.analytics",
      JSON.stringify([
        {
          player: "Offline Ronnie",
          matches: 10,
          wins: 8,
          framesWon: 32,
          framesLost: 12,
          scoringVisits: 48,
          foulPointsDrawn: 14,
          highestScoringVisit: 87,
          winRate: 80,
        },
      ]),
    );
  });
  await page.route("**/api/analytics/players", async (route) => {
    await route.abort("failed");
  });

  await page.goto("/analytics");

  await expect(page.getByText(/most recent cached snapshot/i)).toBeVisible();
  await expect(page.getByText("Offline Ronnie")).toBeVisible();
});

test("login and registration surfaces reflect maintenance mode and unavailable Google auth", async ({ page }) => {
  await mockSession(page, null);
  await mockSettings(page, {
    maintenanceMode: true,
    allowRegistration: false,
    googleAuthEnabled: false,
  });

  await page.goto("/login");
  await expect(page.getByText(/Maintenance mode is active/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Google Sign-In Unavailable" })).toBeDisabled();

  await page.goto("/register");
  await expect(page.getByText(/Registration is temporarily unavailable during maintenance mode/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Account" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Google Sign-Up Unavailable" })).toBeDisabled();
});
