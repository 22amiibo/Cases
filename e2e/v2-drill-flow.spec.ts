import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function finishGeneratedCycle(page: Page, response: string) {
  await page.getByLabel("Your response").fill(response);
  await page.getByRole("button", { name: "Commit response" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Check your response" })).toBeFocused();
  await page.getByRole("button", { name: "Save self-check" }).press("Enter");
  await page.getByRole("button", { name: "View comparison" }).press("Enter");
  await page.getByRole("button", { name: "Finish practice" }).press("Enter");
}

async function expectAccessibleMobileCompletion(page: Page, diagnostic: RegExp) {
  await expect(page.getByText(diagnostic)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
});

test("each skill exposes three V2 reps and preserves the selected rep", async ({ page }) => {
  await page.goto("/drills/structure");

  const repNavigation = page.getByRole("navigation", { name: "V2 practice reps" });
  await expect(repNavigation.getByRole("link")).toHaveCount(3);
  await repNavigation.getByRole("link", {
    name: /structure a delivery-reliability problem/i,
  }).click();

  await expect(page.getByRole("heading", {
    name: "Structure a delivery-reliability problem",
  })).toBeVisible();
  await expect(page.getByText("One operational structure")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Structure a delivery-reliability problem",
  })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("structure V2 completes a generated response and framework checkpoint", async ({ page }) => {
  await page.goto("/drills/structure");
  await expect(page.getByText("One defensible structure")).toHaveCount(0);
  await finishGeneratedCycle(page, "Split profit into revenue and cost, then investigate variable costs first.");

  for (const concept of ["Revenue", "Fixed cost", "Variable cost"]) {
    await page.getByLabel("Major area to add").first().selectOption({ label: concept });
    await page.getByRole("button", { name: "Add major area" }).first().click();
  }
  await page.getByRole("button", { name: "Investigate Variable cost first" }).first().click();
  await page.getByLabel("Why investigate this area first?").first().fill("Variable costs grew faster than revenue.");
  await page.getByRole("button", { name: "Submit framework" }).first().press("Enter");
  await expectAccessibleMobileCompletion(page, /strong structure · system/i);
});

test("prioritization V2 reveals choices only after commitment", async ({ page }) => {
  await page.goto("/drills/prioritization");
  await expect(page.getByLabel("Break down operating costs")).toHaveCount(0);
  await finishGeneratedCycle(page, "Break down costs to distinguish fixed from variable pressure.");
  const orderBeforeRefresh = await page.getByRole("radio").evaluateAll((options) =>
    options.map((option) => (option as HTMLInputElement).value),
  );
  await page.reload();
  expect(await page.getByRole("radio").evaluateAll((options) =>
    options.map((option) => (option as HTMLInputElement).value),
  )).toEqual(orderBeforeRefresh);
  await page.getByLabel("Break down operating costs").check();
  await page.getByRole("button", { name: "Check decision" }).press("Enter");
  await expectAccessibleMobileCompletion(page, /strong priority · system/i);
});

test("quantitative V2 teaches after a wrong answer without revealing it early", async ({ page }) => {
  await page.goto("/drills/quantitative");
  await expect(page.getByText(/Correct answer:/)).toHaveCount(0);
  await finishGeneratedCycle(page, "6 × 700 × $15 × 12; the result should be under $1m and material.");
  await page.getByLabel("Answer", { exact: true }).fill("75600");
  await page.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: "%" }).click();
  await page.getByRole("button", { name: "Check calculation" }).press("Enter");
  await expect(page.getByText("Your answer: 75,600 %")).toBeVisible();
  await expect(page.getByText(/Correct answer:/)).toContainText("756,000 $");
  await expect(page.getByText(/6 × 700 × \$15 × 12 = \$756,000 annually/)).toBeVisible();
  await expectAccessibleMobileCompletion(page, /unit error · system/i);
});

test("exhibit V2 reveals interpretation choices only after commitment", async ({ page }) => {
  await page.goto("/drills/exhibit");
  await expect(page.getByLabel("Labor is the material cost outlier")).toHaveCount(0);
  await finishGeneratedCycle(page, "Labor is the outlier, likely driving margin pressure; isolate overtime next.");
  await page.getByLabel("Labor is the material cost outlier").check();
  await page.getByRole("button", { name: "Check decision" }).press("Enter");
  await expectAccessibleMobileCompletion(page, /strong exhibit chain · system/i);
});

test("synthesis V2 selects decisive evidence and a next step after commitment", async ({ page }) => {
  await page.goto("/drills/synthesis");
  await expect(page.getByLabel("Overtime nearly tripled in six clubs")).toHaveCount(0);
  await finishGeneratedCycle(page, "The decline is labor-led in six clubs; pilot staffing changes there.");
  await page.getByLabel("Overtime nearly tripled in six clubs").check();
  await page.getByLabel("High-overtime clubs have higher turnover").check();
  await page.getByLabel("Highest-value next step").selectOption("staffing-pilot");
  await page.getByRole("button", { name: "Check synthesis" }).press("Enter");
  await expectAccessibleMobileCompletion(page, /strong synthesis · system/i);
});
