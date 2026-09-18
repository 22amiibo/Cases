import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function open(page: Page, activityId: string) {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`/practice/activities/${activityId}?version=1`);
  await page.getByRole("button", { name: "Start activity" }).click();
}

async function expectAccessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
}

test("Clarifying reveals the exact interviewer response after commitment", async ({ page }) => {
  await open(page, "alpinefit-clarifying-v3");
  await expect(page.getByText("Operating margin is operating profit divided by revenue")).toHaveCount(0);
  await page.getByRole("radio", { name: /How is operating margin defined/ }).check();
  await page.getByRole("button", { name: "Commit answer" }).click();
  await expect(page.getByText(/Operating margin is operating profit divided by revenue/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Operating margin is operating profit divided by revenue/)).toBeVisible();
  await expectAccessible(page);
});

test("Exhibit Analysis completes Observe, Prioritize, Interpret, Act", async ({ page }) => {
  await open(page, "alpinefit-exhibit-v3");
  await expect(page.getByRole("table", { name: /Operating cost by category data/ })).toBeVisible();
  await page.getByRole("radio", { name: /Club labor rose by/ }).check();
  await page.getByRole("button", { name: "Commit observe" }).click();
  await page.reload();
  await page.getByRole("radio", { name: "Prioritize the labor outlier" }).check();
  await page.getByRole("button", { name: "Commit prioritize" }).click();
  await page.getByRole("radio", { name: "Labor is the leading margin-pressure candidate" }).check();
  await page.getByRole("button", { name: "Commit interpret" }).click();
  await page.getByRole("radio", { name: "Break labor down by club and driver" }).check();
  await page.getByRole("button", { name: "Commit act" }).click();
  await expect(page.getByText(/connected the labor outlier/)).toBeVisible();
  await expectAccessible(page);
});

test("Brainstorming rewards category coverage after overlap removal", async ({ page }) => {
  await open(page, "alpinefit-brainstorming-v3");
  for (const [idea, category] of [
    ["Membership price or discount mix", "Revenue"],
    ["Overtime hours and premium", "Labor and staffing"],
    ["Occupancy expense", "Other operating costs"],
  ] as const) {
    await page.getByRole("checkbox", { name: idea, exact: true }).check();
    await page.getByLabel(`Category for ${idea}`).selectOption({ label: category });
  }
  await page.getByRole("checkbox", { name: "Prioritize Overtime hours and premium" }).check();
  await page.getByRole("button", { name: "Commit brainstorm" }).click();
  await expect(page.getByText(/covers distinct revenue and cost drivers/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/covers distinct revenue and cost drivers/)).toBeVisible();
  await expectAccessible(page);
});

test("Hypothesis updates a claim through two evidence rounds", async ({ page }) => {
  await open(page, "alpinefit-hypothesis-v3");
  await expect(page.getByText("Operating costs grew 17%, substantially faster than revenue.")).toHaveCount(0);
  await page.getByRole("radio", { name: /Revenue economics/ }).check();
  await page.getByRole("button", { name: "Commit hypothesis" }).click();
  await page.reload();
  await expect(page.getByText("Operating costs grew 17%, substantially faster than revenue.")).toBeVisible();
  await page.getByLabel("Status").selectOption("revise");
  await page.getByRole("radio", { name: /Operating-cost and labor pressure/ }).check();
  await page.getByRole("checkbox", { name: "Use this evidence in the update" }).check();
  await page.getByLabel("Reasoning").selectOption("contradicts");
  await page.getByRole("button", { name: "Commit update" }).click();
  await page.getByRole("checkbox", { name: "Use this evidence in the update" }).check();
  await page.getByLabel("Reasoning").selectOption("supports");
  await page.getByRole("button", { name: "Commit update" }).click();
  await expect(page.getByText(/changed the working claim/)).toBeVisible();
  await expectAccessible(page);
});
