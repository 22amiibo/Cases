import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeAlpineFitV2 } from "./alpinefit-v2-helpers";

async function pressButton(page: Page, name: string) {
  await page.getByRole("button", { name }).press("Enter");
}

test("a guest can complete the full generated case without accessibility violations", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await completeAlpineFitV2(page);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("the required generated opening is keyboard operable", async ({ page }) => {
  await page.goto("/cases/alpinefit-profitability");
  const response = page.getByLabel("Your response");
  await response.focus();
  await response.pressSequentially("Clarify the objective, scope, and decision before structuring.");
  await pressButton(page, "Commit response");
  await pressButton(page, "Save self-check");
  await pressButton(page, "View comparison");
  await pressButton(page, "Finish practice");

  await page.getByLabel("Which performance metric should we explain?").press("Space");
  await page.getByLabel("Over what period did performance change?").press("Space");
  await pressButton(page, "Save opening");

  await expect(page.getByLabel("Major area to add")).toBeVisible();
});

test("case routes show explicit missing, expired, and loading failure screens", async ({
  page,
}) => {
  await page.goto("/cases/not-a-real-case");
  await expect(
    page.getByRole("heading", { name: "Case not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse available cases" })).toBeVisible();

  await page.goto("/cases/alpinefit-profitability");
  await page.evaluate(() => {
    window.sessionStorage.setItem(
      "casework:guest-session:alpinefit-profitability",
      "{expired",
    );
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This case session expired" }),
  ).toBeVisible();
  await pressButton(page, "Start a fresh case");
  await expect(
    page.getByRole("heading", { name: "AlpineFit's shrinking margin" }),
  ).toBeVisible();

  await page.route("**/api/cases/alpinefit-profitability/session", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Case workspace could not be loaded" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try loading again" })).toBeVisible();
});

test("case actions stay unavailable until the authoritative session loads", async ({
  page,
}) => {
  let releaseRequest: (() => void) | undefined;
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route("**/api/cases/alpinefit-profitability/session", async (route) => {
    await requestReleased;
    await route.continue();
  });
  await page.goto("/cases/alpinefit-profitability");

  await expect(
    page.getByRole("heading", { name: "Loading case workspace" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Which performance metric should we explain?"),
  ).toHaveCount(0);

  releaseRequest?.();
  await expect(
    page.getByLabel("Your response"),
  ).toBeVisible();
});

for (const viewport of [
  { name: "phone", width: 320, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`core pages have no horizontal overflow at ${viewport.name} width`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    for (const route of [
      "/",
      "/learn",
      "/learn/courses/profitability-v3?version=1",
      "/drills",
      "/practice",
      "/practice/clarifying",
      "/practice/activities/alpinefit-clarifying-v3?version=1",
      "/cases",
      "/cases/alpinefit-profitability",
      "/progress",
      "/progress/history",
    ]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${route} at ${viewport.width}px`).toBeLessThanOrEqual(0);
    }
  });
}
