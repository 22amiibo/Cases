import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function chooseWithKeyboard(select: Locator, value: string) {
  const optionLabel =
    (await select.locator(`option[value="${value}"]`).textContent()) ?? "";

  expect(optionLabel).not.toHaveLength(0);
  await select.focus();
  await select.pressSequentially(optionLabel, { delay: 10 });
  await expect(select).toHaveValue(value);
}

async function pressButton(page: Page, name: string) {
  await page.getByRole("button", { name }).press("Enter");
}

test("a guest can complete the full case using keyboard controls", async ({
  page,
}) => {
  await page.goto("/cases/alpinefit-profitability");

  await page
    .getByLabel("Which performance metric should we explain?")
    .press("Space");
  await page
    .getByLabel("Over what period did performance change?")
    .press("Space");
  await pressButton(page, "Continue to framework");

  const conceptSelect = page.getByLabel("Concept to add");
  await chooseWithKeyboard(conceptSelect, "revenue");
  await pressButton(page, "Add branch");
  await chooseWithKeyboard(conceptSelect, "variable_cost");
  await pressButton(page, "Add branch");
  await pressButton(page, "Move Variable cost up");
  await pressButton(page, "Start with Variable cost");
  await pressButton(page, "Submit framework");

  await pressButton(page, "Break down operating costs");
  await expect(
    page.getByRole("img", { name: "Operating cost by category chart in $m" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", {
      name: "Operating cost by category data ($m)",
    }),
  ).toBeVisible();
  await pressButton(page, "Inspect variable costs");
  await pressButton(page, "Inspect club labor");
  await pressButton(page, "Inspect overtime usage");

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  const answer = page.getByLabel("Answer in $");
  await answer.focus();
  await answer.pressSequentially("756000");
  await pressButton(page, "Check calculation");
  await expect(page.getByRole("status")).toHaveText("Correct");

  await page.getByLabel("Cost Growth").press("Space");
  await page.getByLabel("Overtime Spike").press("Space");
  await chooseWithKeyboard(page.getByLabel("Next investigation"), "turnover");
  await pressButton(page, "Move to recommendation");

  await chooseWithKeyboard(
    page.getByRole("combobox", { name: "Recommendation" }),
    "stabilize-staffing",
  );
  await page
    .getByLabel(
      "Labor expense grew 34%, while staffed service hours grew only 11%.",
    )
    .press("Space");
  await chooseWithKeyboard(
    page.getByLabel("Risk to manage"),
    "retention-cost",
  );
  await chooseWithKeyboard(
    page.getByLabel("First next step"),
    "six-club-pilot",
  );
  await pressButton(page, "Submit recommendation");

  await expect(
    page.getByRole("heading", { name: "Your case review" }),
  ).toBeVisible();
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
      "/drills",
      "/cases",
      "/cases/alpinefit-profitability",
      "/progress",
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
