import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("consent-v1", "1");
    window.localStorage.setItem("app-role", "caregiver");
    window.localStorage.setItem("prototype-banner-dismissed", "1");
  });
});

test("renders the caregiver home shell and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "看護助手" })).toBeVisible();
  await expect(page.locator('a[href="/about"]')).toBeVisible();
  await expect(page.getByRole("navigation").getByText("首頁")).toBeVisible();
  await expect(page.getByRole("navigation").getByText("醫護卡")).toBeVisible();
  await expect(page.getByRole("navigation").getByText("記錄")).toBeVisible();
});

test("serves public legal and about pages", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "關於本 APP" })).toBeVisible();
  await expect(page.getByRole("link", { name: "隱私權政策" })).toBeVisible();
  await expect(page.getByRole("link", { name: "服務條款" })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "隱私權政策" })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "服務條款" })).toBeVisible();
});

test("session API stays public and redacted", async ({ request }) => {
  const response = await request.get("/api/session");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/application\/json/);
  await expect(response.json()).resolves.toEqual({ loggedIn: false });
});
