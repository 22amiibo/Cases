import { expect, test, type Page } from "@playwright/test";

async function completeQuantitativeDrill(
  page: Page,
  answer: string,
  unit: string,
) {
  await page.getByLabel("Your answer").fill(answer);
  await page.getByLabel("Unit").selectOption(unit);
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("100 / 100")).toBeVisible();
}

async function completeAlpineFit(page: Page) {
  await page.goto("/cases/alpinefit-profitability");
  await page
    .getByLabel("Which performance metric should we explain?")
    .check();
  await page
    .getByLabel("Over what period did performance change?")
    .check();
  await page.getByRole("button", { name: "Continue to framework" }).click();

  await page.getByLabel("Concept to add").selectOption("revenue");
  await page.getByRole("button", { name: "Add branch" }).click();
  await page.getByLabel("Concept to add").selectOption("variable_cost");
  await page.getByRole("button", { name: "Add branch" }).click();
  await page.getByRole("button", { name: "Submit framework" }).click();

  await page
    .getByRole("button", { name: "Break down operating costs" })
    .click();
  await page.getByRole("button", { name: "Inspect variable costs" }).click();
  await page.getByRole("button", { name: "Inspect club labor" }).click();
  await page.getByRole("button", { name: "Inspect overtime usage" }).click();
  await page.getByLabel("Answer in $").fill("756000");
  await page.getByRole("button", { name: "Check calculation" }).click();

  await page.getByLabel("Cost growth").check();
  await page.getByLabel("Overtime spike").check();
  await page.getByLabel("Next investigation").selectOption("turnover");
  await page.getByRole("button", { name: "Move to recommendation" }).click();

  await page
    .getByRole("combobox", { name: "Recommendation" })
    .selectOption("stabilize-staffing");
  await page
    .getByLabel(
      "Labor expense grew 34%, while staffed service hours grew only 11%.",
    )
    .check();
  await page.getByLabel("Risk to manage").selectOption("retention-cost");
  await page.getByLabel("First next step").selectOption("six-club-pilot");
  await page.getByRole("button", { name: "Submit recommendation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your case review" }),
  ).toBeVisible();
}

test("guest sees progress and a deterministic next session after practice", async ({
  page,
}) => {
  await page.goto("/drills/quantitative");
  await completeQuantitativeDrill(page, "25", "$/unit");
  await page.getByRole("button", { name: "Next question" }).click();
  await completeQuantitativeDrill(page, "40000", "orders");
  await completeAlpineFit(page);

  await page.goto("/");
  await page.getByRole("link", { name: "View progress" }).click();

  await expect(
    page.getByRole("heading", { name: "Your practice progress" }),
  ).toBeVisible();
  await expect(page.getByText("3 sessions completed")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quantitative reasoning" }),
  ).toBeVisible();
  await expect(page.getByText("Strong").first()).toBeVisible();
  await expect(page.getByText("Last-10 trend").first()).toBeVisible();
  await expect(page.getByText("correct_calculation")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recommended next: Diagnostic mix" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Recommended next: Diagnostic mix" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /practice quantitative reasoning/i }),
  ).toHaveAttribute("href", "/drills/quantitative");
  await expect(
    page.getByRole("link", { name: /practice alpinefit/i }),
  ).toHaveAttribute("href", "/cases/alpinefit-profitability");
});
