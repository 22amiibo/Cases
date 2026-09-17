import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { completeAlpineFitV2 } from "./alpinefit-v2-helpers";

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

test("guest sees progress and a deterministic next session after practice", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/drills/quantitative");
  await page.getByText("Open the 10-drill Legacy V1 library").click();
  await completeQuantitativeDrill(page, "25", "$/unit");
  await page.getByRole("button", { name: "Next question" }).click();
  await completeQuantitativeDrill(page, "40000", "orders");
  await completeAlpineFitV2(page);

  await page.goto("/");
  await page.getByRole("link", { name: "View progress" }).click();

  await expect(
    page.getByRole("heading", { name: "Your practice progress" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your learning evidence" }),
  ).toBeVisible();
  await expect(page.getByText("1 V2 sessions · 2 Legacy V1 sessions")).toBeVisible();
  await expect(
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Legacy V1" }) })
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "Quantitative reasoning" }) })
      .getByText("Strong", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recommended next: V2 diagnostic mix" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Recommended next: V2 diagnostic mix" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /practice case opening & clarification/i }),
  ).toHaveAttribute("href", "/drills/clarification");
  await expect(
    page.getByRole("link", { name: /practice alpinefit/i }),
  ).toHaveAttribute("href", "/cases/alpinefit-profitability");
});

test("mixed history keeps V2 evidence separate and reflows at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.setItem("casework:practice-history", JSON.stringify({
      drillAttempts: [
        {
          attemptId: "legacy-extreme",
          userId: "guest",
          drillId: "legacy-structure",
          skillId: "structure",
          score: 100,
          feedbackCodes: ["legacy-perfect"],
          conceptIdsPracticed: ["revenue"],
          completedAt: "2026-09-16T00:00:00.000Z",
          scoringVersion: "v1",
          contentVersion: null,
          eventSchemaVersion: null,
          scaffoldingLevel: null,
          learningEvidence: null,
          diagnostics: [],
        },
        {
          attemptId: "v2-opening",
          userId: "guest",
          drillId: "clarification-v2-1",
          skillId: "clarification",
          score: 0,
          feedbackCodes: [],
          conceptIdsPracticed: ["objective"],
          completedAt: "2026-09-17T00:00:00.000Z",
          scoringVersion: "v2",
          contentVersion: 2,
          eventSchemaVersion: 2,
          scaffoldingLevel: "beginner",
          learningEvidence: {
            interactionId: "v2-opening",
            skillId: "clarification",
            scoringVersion: "v2",
            contentVersion: 2,
            eventSchemaVersion: 2,
            scaffoldingLevel: "beginner",
            responses: [{
              responseId: "v2-opening-r1",
              interactionId: "v2-opening",
              revision: 1,
              revisionOf: null,
              responseKind: "clarification",
              text: "Clarify the target metric.",
              committedAtMs: 1,
            }],
            rubricOutcomes: [{ criterionId: "objective", met: false }],
            diagnostics: [{
              code: "objective_not_reframed",
              source: "self_assessment",
              severity: "coaching",
              responseId: "v2-opening-r1",
            }],
          },
          diagnostics: [{
            code: "objective_not_reframed",
            source: "self_assessment",
            severity: "coaching",
            responseId: "v2-opening-r1",
          }],
        },
      ],
      caseAttempts: [],
    }));
  });

  await page.goto("/progress");
  const openingCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Case opening & clarification" }) });
  await expect(openingCard.getByText("Building", { exact: true })).toBeVisible();
  await expect(openingCard.getByText(/Self-assessed/)).toBeVisible();
  await expect(page.getByText("Legacy score 100")).toBeVisible();
  await expect(page.getByText(/Interview ready/i)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
