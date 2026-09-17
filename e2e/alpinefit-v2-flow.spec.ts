import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeAlpineFitV2 } from "./alpinefit-v2-helpers";

test("AlpineFit V2 completes the full generated loop with refresh and retry", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 900 });
  const precommitBodies: string[] = [];
  page.on("response", async (response) => {
    if (precommitBodies.length === 0 && response.url().includes("/api/cases/alpinefit-profitability/session")) {
      precommitBodies.push(await response.text());
    }
  });

  await completeAlpineFitV2(page, { refresh: true, recommendationRetry: true });

  expect(precommitBodies.some((body) => body.includes("756000"))).toBe(false);
  expect(precommitBodies.some((body) => body.includes("stabilize-staffing"))).toBe(false);
  await expect(page.getByText("Revision 2")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
