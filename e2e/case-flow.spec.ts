import { expect, test, type Page } from "@playwright/test";
import { completeAlpineFitV2 } from "./alpinefit-v2-helpers";

async function completeNoCalculationCase(
  page: Page,
  {
    title,
    startLink,
    clarification,
    frameworkConceptIds,
    investigationActions,
    synthesisEvidence,
    nextInvestigationId,
    decisionId,
    recommendationEvidence,
    riskId,
    nextStepId,
  }: {
    title: string;
    startLink: string;
    clarification: string;
    frameworkConceptIds: string[];
    investigationActions: string[];
    synthesisEvidence: RegExp[];
    nextInvestigationId: string;
    decisionId: string;
    recommendationEvidence: RegExp[];
    riskId: string;
    nextStepId: string;
  },
) {
  await page.goto("/cases");
  await page.getByRole("link", { name: startLink }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByLabel(clarification).check();
  await page.getByRole("button", { name: "Continue to framework" }).click();
  for (const conceptId of frameworkConceptIds) {
    await page.getByLabel("Major area to add").selectOption(conceptId);
    await page.getByRole("button", { name: "Add major area" }).click();
  }
  await page.getByRole("button", { name: "Submit framework" }).click();

  for (const action of investigationActions) {
    await page.getByRole("button", { name: action }).click();
  }

  await expect(
    page.getByRole("heading", { name: "Prepare your recommendation" }),
  ).toBeVisible();
  for (const evidence of synthesisEvidence) {
    await page.getByRole("checkbox", { name: evidence }).check();
  }
  await page.getByLabel("Next investigation").selectOption(nextInvestigationId);
  await page.getByRole("button", { name: "Move to recommendation" }).click();

  await expect(
    page.getByRole("heading", { name: "Make your recommendation" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Recommendation" })
    .selectOption(decisionId);
  for (const evidence of recommendationEvidence) {
    await page.getByRole("checkbox", { name: evidence }).check();
  }
  await page.getByLabel("Risk to manage").selectOption(riskId);
  await page.getByLabel("First next step").selectOption(nextStepId);
  await page.getByRole("button", { name: "Submit recommendation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your case review" }),
  ).toBeVisible();
}

test("home introduces deliberate case practice", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Choose your next useful rep.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /continue as guest/i }),
  ).toHaveAttribute("href", "/cases/alpinefit-profitability");
});

test("a second authored case opens with deterministic session data", async ({
  page,
}) => {
  await page.goto("/cases");

  await expect(page.getByRole("article")).toHaveCount(6);
  await page
    .getByRole("link", { name: "Start NorthStar's margin squeeze" })
    .click();
  await expect(
    page.getByRole("heading", { name: "NorthStar's margin squeeze" }),
  ).toBeVisible();

  await page
    .getByLabel("Which performance measure should we explain?")
    .check();
  await page.getByRole("button", { name: "Continue to framework" }).click();
  await page.getByLabel("Major area to add").selectOption("materials");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByLabel("Major area to add").selectOption("price");
  await page.getByRole("button", { name: "Add major area" }).click();
  await page.getByRole("button", { name: "Submit framework" }).click();

  await page.getByRole("button", { name: "Break down unit costs" }).click();
  await expect(
    page.getByText(
      "Input costs rose sharply while direct labor remained comparatively stable. The cost bridge is now available.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Unit production cost by category" }),
  ).toBeVisible();
  await expect(page.getByText("Guest session · 3 events saved")).toBeVisible();
});

test("the legacy no-calculation case can synthesize and complete", async ({ page }) => {
  await completeNoCalculationCase(page, {
    title: "NorthStar's margin squeeze",
    startLink: "Start NorthStar's margin squeeze",
    clarification: "Which performance measure should we explain?",
    frameworkConceptIds: ["materials", "price"],
    investigationActions: [
      "Break down unit costs",
      "Inspect material and freight inputs",
      "Understand revenue performance",
      "Inspect realized pricing",
      "Review customer contract terms",
      "Compare repricing mechanisms",
    ],
    synthesisEvidence: [/Input Inflation/, /Annual Repricing/],
    nextInvestigationId: "renewal_pipeline",
    decisionId: "accelerate-repricing",
    recommendationEvidence: [/Raw-material/, /annual renewal/],
    riskId: "customer-pushback",
    nextStepId: "renewal-pilot",
  });
});

test("guest can recover a failed AlpineFit V2 save without a duplicate attempt", async ({ page }) => {
  test.setTimeout(90_000);
  await completeAlpineFitV2(page, { saveRecovery: true });

  const savedAttempt = await page.evaluate(() => {
    const stored = window.sessionStorage.getItem("casework:practice-history");
    if (!stored) return null;
    const history = JSON.parse(stored) as {
      caseAttempts: Array<{ caseId: string; contentVersion: number; events: unknown[] }>;
    };
    return { attempt: history.caseAttempts[0] ?? null, count: history.caseAttempts.length };
  });
  expect(savedAttempt).toMatchObject({
    attempt: { caseId: "alpinefit-profitability", contentVersion: 2 },
    count: 1,
  });
  expect(savedAttempt?.attempt.events.length).toBeGreaterThan(10);
});
