import { expect, test } from "@playwright/test";
import { mockSession, mockSettings } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockSession(page, null);
  await mockSettings(page);
});

test("home page filters live and scheduled matches from browser-fetched data", async ({ page }) => {
  await page.route("**/api/matches", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matches: [
          {
            _id: "live-1",
            title: "Masters Table One",
            playerA: "Judd Trump",
            playerB: "Mark Selby",
            status: "live",
            currentFrame: 4,
            totalFrames: 7,
            framesToWin: 4,
            framesWonA: 2,
            framesWonB: 1,
            scoreA: 54,
            scoreB: 22,
          },
          {
            _id: "scheduled-1",
            title: "Evening Session",
            playerA: "Luca Brecel",
            playerB: "Mark Allen",
            status: "scheduled",
            scheduledTime: "2026-03-26T18:30:00.000Z",
          },
          {
            _id: "finished-1",
            title: "Morning Session",
            playerA: "Ronnie O'Sullivan",
            playerB: "John Higgins",
            status: "finished",
            framesWonA: 4,
            framesWonB: 3,
            winner: "Ronnie O'Sullivan",
          },
        ],
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Advanced Player Search" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Judd Trump vs Mark Selby/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Luca Brecel/i })).toBeVisible();

  await page.getByPlaceholder("Search matches or players...").fill("Brecel");

  await expect(page.getByText("No matching live matches")).toBeVisible();
  await expect(page.getByText("Luca Brecel")).toBeVisible();
});

test("players page applies browser-side search inputs against fetched API data", async ({ page }) => {
  await page.route("**/api/players**", async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get("q") || "").toLowerCase();
    const country = url.searchParams.get("country") || "";
    const players = [
      { _id: "p1", name: "Judd Trump", country: "England", rank: 1, favoriteCount: 12 },
      { _id: "p2", name: "Pankaj Advani", country: "India", rank: 8, favoriteCount: 5 },
    ].filter((player) => {
      const queryMatch = !query || player.name.toLowerCase().includes(query);
      const countryMatch = !country || player.country === country;
      return queryMatch && countryMatch;
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ players }),
    });
  });

  await page.route("**/api/user/profile", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unauthorized" }),
    });
  });

  await page.goto("/players");

  await expect(page.getByText("Judd Trump")).toBeVisible();
  await page.getByPlaceholder("Search player").fill("Pankaj");
  await page.getByPlaceholder("Search player").blur();

  await expect(page.getByText("Pankaj Advani")).toBeVisible();
  await expect(page.getByText("Judd Trump")).toHaveCount(0);
});

test("free-tier multi-stream keeps the selection capped in the browser UI", async ({ page }) => {
  await mockSession(page, { role: "user", subscriptionTier: "free", name: "Free Viewer" });
  await page.route("**/api/matches?status=live", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matches: [
          {
            _id: "m1",
            title: "Table One",
            playerA: "Judd Trump",
            playerB: "Mark Selby",
            status: "live",
            streamUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
          {
            _id: "m2",
            title: "Table Two",
            playerA: "Luca Brecel",
            playerB: "Shaun Murphy",
            status: "live",
            streamUrl: "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
          },
        ],
      }),
    });
  });

  await page.goto("/multi-stream");

  await expect(page.getByText("Selected 0/1")).toBeVisible();
  await page.getByRole("button", { name: /Judd Trump vs Mark Selby/i }).click();
  await expect(page.getByText("Selected 1/1")).toBeVisible();
  await expect(page.getByTitle("Table One")).toBeVisible();

  await page.getByRole("button", { name: /Luca Brecel vs Shaun Murphy/i }).click();
  await expect(page.getByText("Selected 1/1")).toBeVisible();
  await expect(page.getByTitle("Table Two")).toBeVisible();
});
