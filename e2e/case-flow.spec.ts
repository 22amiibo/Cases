import { expect, test } from "@playwright/test";

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
  await page.getByRole("button", { name: "Submit recommendation" }).click();
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
    return history.caseAttempts[0] ?? null;
  });
  expect(savedAttempt).toMatchObject({
    caseId: "alpinefit-profitability",
    skillScores: {
      structure: expect.any(Number),
      prioritization: expect.any(Number),
      quantitative: expect.any(Number),
      exhibit: expect.any(Number),
      synthesis: expect.any(Number),
    },
  });
  expect(savedAttempt?.events).toHaveLength(10);
});
