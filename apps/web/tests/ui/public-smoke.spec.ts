import { expect, test } from "@playwright/test";

test("public routes render core viewer surfaces", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SnookerStream")).toBeVisible();

  await page.goto("/players");
  await expect(page.getByText("Advanced Player Search")).toBeVisible();

  await page.goto("/analytics");
  await expect(page.getByText("Analytics Suite")).toBeVisible();

  await page.goto("/offline");
  await expect(page.getByText("Offline Mode")).toBeVisible();
});

test("unauthenticated users are redirected away from admin pages", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});
