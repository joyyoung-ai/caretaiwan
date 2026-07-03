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
  await expect(page.getByRole("heading", { name: "照護行程" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "請假紀錄" })).toBeVisible();
  await expect(page.getByRole("button", { name: "未來 7 天" })).toBeVisible();
  await expect(page.getByRole("button", { name: "未來 30 天" })).toBeVisible();
  await expect(page.getByRole("button", { name: "送出請假紀錄" })).toBeVisible();
  await expect(page.getByText("LINE 提醒尚未啟用")).toBeVisible();
  await expect(page.locator('a[href="/about"]')).toBeVisible();
  await expect(page.getByRole("navigation").getByText("首頁")).toBeVisible();
  await expect(page.getByRole("navigation").getByText("醫護卡")).toBeVisible();
  await expect(page.getByRole("navigation").getByText("記錄")).toBeVisible();
});

test("renders the family care calendar management shell", async ({ page }) => {
  await page.route("**/api/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ loggedIn: true, name: "家屬", picture: null }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("app-role", "family");
    window.localStorage.setItem(
      "elderStore",
      JSON.stringify({
        activeId: "elder-e2e",
        elders: [
          {
            id: "elder-e2e",
            name: "王阿嬤",
            gender: "female",
            birthday: "",
            bloodType: "",
            history: "",
            allergies: "",
            medications: [],
            doctor: "",
            hospital: "",
            contacts: [],
            updatedAt: Date.now(),
          },
        ],
      })
    );
  });

  await page.goto("/family");

  await expect(page.getByRole("heading", { name: "照護行程" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增照護行程" })).toBeVisible();
  await expect(page.getByRole("button", { name: "取消行程" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "請假紀錄" })).toBeVisible();
  await expect(page.getByRole("button", { name: "已收到" })).toBeVisible();
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
