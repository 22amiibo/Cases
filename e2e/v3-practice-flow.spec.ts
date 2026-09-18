import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("Practice discovers all flagship labs and reopens a completed attempt", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/practice");

  await expect(page.getByRole("link", { name: /Open .* lab/ })).toHaveCount(4);
  await expect(page.getByRole("link", { name: "Open Legacy V1/V2 drills" })).toHaveAttribute("href", "/drills");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.getByRole("link", { name: "Open Clarifying lab" }).click();
  await page.getByRole("link", { name: /Start Choose the first AlpineFit question/ }).click();
  await page.getByRole("button", { name: "Start activity" }).click();
  await page.getByRole("radio", { name: /How is operating margin defined/ }).check();
  await page.getByRole("button", { name: "Commit answer" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish activity" }).click();
  await page.getByRole("link", { name: "Review completed attempt" }).click();

  await expect(page.getByRole("heading", { name: "Choose the first AlpineFit question" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Committed timeline" })).toBeVisible();
  await expect(page.getByText("activity completed")).toBeVisible();
});
