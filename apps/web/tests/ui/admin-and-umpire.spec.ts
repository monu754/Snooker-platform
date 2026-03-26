import { expect, test } from "@playwright/test";
import { mockSession } from "./fixtures";

test("admin settings page loads and saves toggles through the browser", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-playwright-role": "admin" });
  await mockSession(page, {
    id: "admin-1",
    role: "admin",
    name: "Admin One",
    email: "admin@example.com",
  });

  let savedPayload: Record<string, unknown> | null = null;

  await page.route("**/api/admin/settings", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          maintenanceMode: false,
          allowRegistration: true,
          globalAnnouncement: "League finals tonight",
        }),
      });
      return;
    }

    savedPayload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto("/admin/settings");

  await expect(page.getByRole("heading", { name: "Platform Settings" })).toBeVisible();
  await expect(page.locator("textarea")).toHaveValue("League finals tonight");

  await page.getByRole("button", { name: "Save Configuration" }).click();
  await expect(page.getByText("Settings updated successfully.")).toBeVisible();

  expect(savedPayload).toMatchObject({
    maintenanceMode: false,
    allowRegistration: true,
    globalAnnouncement: "League finals tonight",
  });
});

test("admin player manager filters registered players in the browser", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-playwright-role": "admin" });
  await mockSession(page, {
    id: "admin-1",
    role: "admin",
    name: "Admin One",
    email: "admin@example.com",
  });

  await page.route("**/api/admin/players", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        players: [
          { _id: "p1", name: "Judd Trump", country: "England", rank: 1, bio: "Attacking player", favoriteCount: 12 },
          { _id: "p2", name: "Pankaj Advani", country: "India", rank: 8, bio: "Cueist from India", favoriteCount: 5 },
        ],
      }),
    });
  });

  await page.goto("/admin/players");

  await expect(page.getByRole("heading", { name: "Player Manager" })).toBeVisible();
  await expect(page.getByText("Judd Trump")).toBeVisible();

  await page.getByPlaceholder("Search player name, country, or bio...").fill("India");

  await expect(page.getByText("Pankaj Advani")).toBeVisible();
  await expect(page.getByText("Judd Trump")).toHaveCount(0);
});

test("umpire dashboard opens an assigned scoring panel and records a score action", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-playwright-role": "umpire" });
  await mockSession(page, {
    id: "umpire-1",
    role: "umpire",
    name: "Umpire One",
    email: "umpire@example.com",
  });

  let lastPatchBody: Record<string, unknown> | null = null;

  await page.route("**/api/umpire/matches", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matches: [
          {
            _id: "match-1",
            playerA: "Judd Trump",
            playerB: "Mark Selby",
            status: "live",
            scheduledTime: "2026-03-26T18:30:00.000Z",
            format: "semi-final",
            totalFrames: 7,
          },
        ],
      }),
    });
  });

  await page.route("**/api/matches/match-1", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          match: {
            _id: "match-1",
            playerA: "Judd Trump",
            playerB: "Mark Selby",
            scoreA: 0,
            scoreB: 0,
            framesWonA: 0,
            framesWonB: 0,
            currentFrame: 1,
            totalFrames: 7,
            framesToWin: 4,
            status: "live",
            activePlayer: "A",
            umpireId: "umpire-1",
          },
          events: [],
        }),
      });
      return;
    }

    lastPatchBody = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        event: { id: "event-1" },
      }),
    });
  });

  await page.goto("/umpire");

  await expect(page.getByRole("heading", { name: "My Assigned Matches" })).toBeVisible();
  await page.getByRole("link", { name: /Open Scoring Panel/i }).click();

  await expect(page.getByText("Record Points for")).toBeVisible();
  await page.getByRole("button", { name: /1/ }).first().click();

  expect(lastPatchBody).toMatchObject({
    scoreA: 1,
    scoreB: 0,
    currentFrame: 1,
    framesWonA: 0,
    framesWonB: 0,
  });
  await expect(page.getByText("Potted Red")).toBeVisible();
});
