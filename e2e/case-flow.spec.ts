import { expect, test, type Page } from "@playwright/test";

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
    await page.getByLabel("Concept to add").selectOption(conceptId);
    await page.getByRole("button", { name: "Add branch" }).click();
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
      name: "Practice case interviews by practicing the thinking.",
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
  await page.getByLabel("Concept to add").selectOption("materials");
  await page.getByRole("button", { name: "Add branch" }).click();
  await page.getByLabel("Concept to add").selectOption("price");
  await page.getByRole("button", { name: "Add branch" }).click();
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

test("no-calculation cases can synthesize and complete", async ({ page }) => {
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

  await completeNoCalculationCase(page, {
    title: "GoldenLoaf's delayed orders",
    startLink: "Start GoldenLoaf's delayed orders",
    clarification: "Which service outcome should we improve?",
    frameworkConceptIds: ["capacity", "utilization"],
    investigationActions: [
      "Compare capacity by production stage",
      "Inspect oven utilization and queues",
      "Analyze oven changeovers",
      "Review the production-sequencing pilot",
    ],
    synthesisEvidence: [/Process Capacity/, /Changeover Capacity Loss/],
    nextInvestigationId: "peak-coverage",
    decisionId: "sequence-and-flex",
    recommendationEvidence: [/Daily effective capacity/, /Cleaning and temperature/],
    riskId: "freshness-window",
    nextStepId: "four-week-rollout",
  });
});

test("guest can complete AlpineFit and review the case replay", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Practice a case" }).click();

  await page.getByRole("link", { name: "Start AlpineFit's shrinking margin" }).click();
  await expect(
    page.getByRole("heading", { name: "AlpineFit's shrinking margin" }),
  ).toBeVisible();

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
  await expect(
    page.getByText(
      "Operating costs grew 17%. The cost-category exhibit is now available.",
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Scratchpad" })
    .fill("Costs are growing faster than revenue.");
  await expect(
    page.getByRole("heading", { name: "Operating cost by category" }),
  ).toBeVisible();
  await expect(page.getByText("Guest session · 4 events saved")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Operating cost by category" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Scratchpad" })).toHaveValue(
    "Costs are growing faster than revenue.",
  );
  await expect(page.getByText("Guest session · 4 events saved")).toBeVisible();
  await page.getByRole("button", { name: "Inspect variable costs" }).click();
  await page.getByRole("button", { name: "Inspect club labor" }).click();
  await page.getByRole("button", { name: "Inspect overtime usage" }).click();

  await page.getByLabel("Answer in $").fill("756000");
  await page.getByRole("button", { name: "Check calculation" }).click();
  await expect(page.getByRole("status")).toHaveText("Correct");

  await page.getByLabel("Cost growth").check();
  await page.getByLabel("Overtime spike").check();
  await page.getByLabel("Next investigation").selectOption("turnover");
  await page.getByRole("button", { name: "Move to recommendation" }).click();

  await expect(
    page.getByRole("heading", { name: "Make your recommendation" }),
  ).toBeVisible();

  await page
    .getByRole("combobox", { name: "Recommendation" })
    .selectOption("stabilize-staffing");
  await page
    .getByLabel("Labor expense grew 34%, while staffed service hours grew only 11%.")
    .check();
  await page.getByLabel("Risk to manage").selectOption("retention-cost");
  await page.getByLabel("First next step").selectOption("six-club-pilot");

  await page.evaluate(() => {
    const browserWindow = window as typeof window & {
      restorePracticeStorage?: () => void;
    };
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "casework:practice-history") {
        throw new DOMException("Storage unavailable");
      }
      return originalSetItem.call(this, key, value);
    };
    browserWindow.restorePracticeStorage = () => {
      Storage.prototype.setItem = originalSetItem;
    };
  });
  await page.getByRole("button", { name: "Submit recommendation" }).click();
  await expect(
    page.getByText("We could not save your recommendation. Try again."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Make your recommendation" }),
  ).toBeVisible();
  await expect(page.getByText("Guest session · 9 events saved")).toBeVisible();

  await page.reload();
  await page
    .getByRole("button", { name: "Retry saving completed case" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your case review" }),
  ).toBeVisible();
  await expect(page.getByText("Example efficient path")).toBeVisible();
  await expect(page.getByText("critical found").first()).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Recommendation: 0%" }),
  ).toBeVisible();
  await expect(page.getByText("unsupported_recommendation")).toBeVisible();

  await page.waitForFunction(() => {
    const stored = window.sessionStorage.getItem(
      "casework:guest-session:alpinefit-profitability",
    );
    return stored && JSON.parse(stored).events.length === 10;
  });
  const eventTimes = await page.evaluate(() => {
    const stored = window.sessionStorage.getItem(
      "casework:guest-session:alpinefit-profitability",
    );
    const events = stored
      ? (JSON.parse(stored).events as Array<{ atMs: number }>)
      : [];
    return events.map((event) => event.atMs);
  });
  expect(
    eventTimes.every(
      (time, index) => index === 0 || time >= eventTimes[index - 1],
    ),
  ).toBe(true);

  const savedAttempt = await page.evaluate(() => {
    const stored = window.sessionStorage.getItem("casework:practice-history");
    if (!stored) return null;
    const history = JSON.parse(stored) as {
      caseAttempts: Array<{
        caseId: string;
        events: unknown[];
        skillScores: Record<string, number>;
      }>;
    };
    return {
      attempt: history.caseAttempts[0] ?? null,
      attemptCount: history.caseAttempts.length,
    };
  });
  expect(savedAttempt?.attempt).toMatchObject({
    caseId: "alpinefit-profitability",
    skillScores: {
      structure: expect.any(Number),
      prioritization: expect.any(Number),
      quantitative: expect.any(Number),
      exhibit: expect.any(Number),
      synthesis: expect.any(Number),
    },
  });
  expect(savedAttempt?.attempt?.events).toHaveLength(10);
  expect(savedAttempt?.attemptCount).toBe(1);
});
