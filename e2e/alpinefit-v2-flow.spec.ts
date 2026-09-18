import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeAlpineFitV2 } from "./alpinefit-v2-helpers";

test("AlpineFit case tools stay optional, keyboard friendly, and private", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/cases/alpinefit-profitability");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  const walkthroughButton = page.getByRole("button", { name: "How this case works" });
  await walkthroughButton.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await expect(dialog).not.toContainText("$756,000");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(walkthroughButton).toBeFocused();

  const scratchpad = page.getByRole("textbox", { name: "Scratchpad" });
  await scratchpad.fill("- Revenue");
  await scratchpad.press("End");
  await scratchpad.press("Enter");
  await scratchpad.pressSequentially("Cost");
  await expect(scratchpad).toHaveValue("- Revenue\n- Cost");
  await scratchpad.press("Tab");
  await expect(scratchpad).toHaveValue("- Revenue\n  - Cost");

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("AlpineFit V2 completes the full generated loop with refresh and retry", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 900 });
  const precommitBodies: string[] = [];
  page.on("response", async (response) => {
    if (precommitBodies.length === 0 && response.url().includes("/api/cases/alpinefit-profitability/session")) {
      precommitBodies.push(await response.text());
    }
  });

  await completeAlpineFitV2(page, {
    refresh: true,
    recommendationRetry: true,
    calculationRetry: true,
  });

  expect(precommitBodies.some((body) => body.includes("756000"))).toBe(false);
  expect(precommitBodies.some((body) => body.includes("stabilize-staffing"))).toBe(false);
  await expect(page.getByText("Revision 2", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("AlpineFit Interview Mode defers authored feedback until the case is complete", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 900 });
  const revealBodies: Array<{ url: string; body: string }> = [];
  await page.route(/\/api\/cases\/alpinefit-profitability\/(?:session|cycle\/(?:commit|complete)|hypotheses\/(?:commit|complete)|exhibits\/[^/]+\/commit)/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    revealBodies.push({ url: response.url(), body });
    await route.fulfill({ response, body });
  });

  await page.goto("/cases/alpinefit-profitability?mode=interview");
  await expect(page.getByLabel("Interview timer")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await completeAlpineFitV2(page, {
    interview: true,
    refresh: true,
    calculationRetry: true,
    saveRecovery: true,
  });

  const precompletionBodies = revealBodies
    .filter(({ body }) => !body.includes('"review":{'))
    .map(({ body }) => body);
  expect(precompletionBodies).not.toEqual([]);
  expect(precompletionBodies.every((body) => !body.includes("Current overtime creates approximately $756,000"))).toBe(true);
  expect(precompletionBodies.every((body) => !body.includes("One defensible interpretation"))).toBe(true);
  expect(precompletionBodies.every((body) => !body.includes("arithmetic_error"))).toBe(true);
  await expect(page.getByRole("heading", { name: "Your case review" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
