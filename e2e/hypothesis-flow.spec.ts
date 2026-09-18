import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const initialPrompt = {
  interactionId: "initial-hypothesis",
  responseKind: "initial_hypothesis",
  prompt: "State your initial hypothesis and how you would test it.",
  scaffoldingLevel: "beginner",
  guidance: ["Choose a falsifiable explanation."],
};

const updatePrompt = {
  interactionId: "hypothesis-update",
  responseKind: "hypothesis_update",
  prompt: "Retain, revise, or reject your hypothesis using the revealed evidence.",
  scaffoldingLevel: "beginner",
  guidance: ["Name the evidence that changed your view."],
};

const options = [
  { id: "revenue-pressure", label: "Revenue pressure is the main cause" },
  { id: "cost-pressure", label: "Cost pressure is the main cause" },
];

test("a V2 hypothesis is formed, recovered, and revised with revealed evidence", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript(() => {
    const storageKey = "casework:guest-session:alpinefit-profitability";
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      contentVersion: 2,
      clarificationComplete: true,
      clarificationDraftIds: ["target-metric"],
      events: [
        {
          type: "case_opening_submitted",
          eventSchemaVersion: 2,
          responses: [{ responseId: "opening-1", interactionId: "alpinefit-opening", revision: 1, revisionOf: null, responseKind: "case_opening", text: "Clarify the objective.", committedAtMs: 1 }],
          rubricOutcomes: [],
          diagnostics: [],
          questions: [{ questionId: "target-metric", interviewerResponse: "Focus on the six-point decline in EBITDA margin, not absolute revenue growth." }],
          authoredComparisonViewed: true,
          atMs: 1,
        },
        { type: "framework_submitted", eventSchemaVersion: 2, branches: [{ conceptId: "revenue", children: [] }, { conceptId: "variable_cost", children: [] }], priorityConceptId: "revenue", rationale: "Test revenue first.", atMs: 2 },
      ],
    }));
  });

  let completedUpdate: Record<string, unknown> | null = null;
  await page.route("**/api/cases/alpinefit-profitability/session", async (route) => {
    const body = route.request().postDataJSON() as { events: Array<{ type: string }> };
    const formed = body.events.some(({ type }) => type === "hypothesis_formed");
    const investigated = body.events.some(({ type }) => type === "node_investigated");
    const updated = body.events.some(({ type }) => type === "hypothesis_updated");
    await route.fulfill({ json: {
      currentStage: "investigate",
      availableActions: formed ? [{ id: "costs", conceptId: "variable_cost", label: "Review cost growth" }] : [],
      facts: investigated ? [{ id: "cost-growth", text: "Operating costs grew 17% while revenue grew 8%." }] : [],
      exhibits: [],
      interpretedExhibitIds: [],
      calculations: [],
      completedCalculationIds: [],
      interviewerResponse: investigated ? "Costs grew substantially faster than revenue." : null,
      hypothesis: !formed
        ? { phase: "initial", prompt: initialPrompt, currentHypothesisId: null, revisionOfResponseId: null }
        : investigated && !updated
          ? { phase: "update", prompt: updatePrompt, currentHypothesisId: "revenue-pressure", revisionOfResponseId: "hypothesis-1" }
          : null,
      recommendation: null,
      synthesis: null,
      recommendationPrompt: null,
      review: null,
    } });
  });

  await page.route("**/api/cases/alpinefit-profitability/hypotheses/commit", async (route) => {
    const body = route.request().postDataJSON() as { phase: "initial" | "update" };
    await route.fulfill({ json: {
      reveal: {
        criteria: [{ id: body.phase === "initial" ? "testable" : "evidence", label: body.phase === "initial" ? "Makes a testable claim" : "Links evidence to the update" }],
        comparison: { title: "One defensible view", text: body.phase === "initial" ? "Start with cost pressure." : "Revise toward cost pressure." },
        diagnosticRules: [],
      },
      options,
    } });
  });

  await page.route("**/api/cases/alpinefit-profitability/hypotheses/complete", async (route) => {
    const body = route.request().postDataJSON() as {
      phase: "initial" | "update";
      hypothesisId: string | null;
      status?: "retain" | "revise" | "reject";
      evidenceIds: string[];
      atMs: number;
      cycle: {
        responses: Array<{ responseId: string; text: string }>;
        assessments: Array<{ outcomes: Array<{ criterionId: string; met: boolean }> }>;
        diagnostics: Array<Record<string, unknown>>;
      };
    };
    const latest = body.cycle.responses.at(-1);
    const assessment = body.cycle.assessments.at(-1);
    if (!latest || !assessment) throw new Error("Expected a completed learning cycle");
    const event = body.phase === "initial" ? {
      type: "hypothesis_formed",
      eventSchemaVersion: 2,
      hypothesisId: body.hypothesisId,
      evidenceIds: [],
      revisionOfResponseId: null,
      responses: body.cycle.responses,
      rubricOutcomes: assessment.outcomes,
      diagnostics: body.cycle.diagnostics,
      rationale: latest.text,
      authoredComparisonViewed: true,
      atMs: body.atMs,
    } : {
      type: "hypothesis_updated",
      eventSchemaVersion: 2,
      status: body.status,
      previousHypothesisId: "revenue-pressure",
      hypothesisId: body.hypothesisId,
      evidenceIds: body.evidenceIds,
      revisionOfResponseId: "hypothesis-1",
      responses: body.cycle.responses,
      rubricOutcomes: assessment.outcomes,
      diagnostics: [{ code: "strong_hypothesis_update", source: "system", severity: "strength", responseId: latest.responseId }],
      rationale: latest.text,
      authoredComparisonViewed: true,
      atMs: body.atMs,
    };
    if (body.phase === "update") completedUpdate = event;
    await route.fulfill({ json: { event } });
  });

  await page.goto("/cases/alpinefit-profitability");
  await page.getByLabel("Your response").fill("Revenue pressure is my initial hypothesis; test price and volume first.");
  await page.getByRole("button", { name: "Commit response" }).press("Enter");
  await page.getByRole("button", { name: "Save self-check" }).press("Enter");
  await page.getByRole("button", { name: "View comparison" }).press("Enter");
  await page.getByRole("button", { name: "Finish practice" }).press("Enter");
  await page.getByRole("combobox", { name: "Initial hypothesis", exact: true }).selectOption("revenue-pressure");
  await page.getByRole("button", { name: "Start investigation" }).press("Enter");

  await page.getByRole("button", { name: "Review cost growth" }).press("Enter");
  await page.getByLabel("Your response").fill("Costs grew faster than revenue, so the initial view should be revised.");
  await page.getByRole("button", { name: "Commit response" }).press("Enter");
  await page.getByRole("button", { name: "Save self-check" }).press("Enter");
  await page.getByRole("button", { name: "View comparison" }).press("Enter");
  await page.getByRole("button", { name: "Finish practice" }).press("Enter");

  await expect(page.getByLabel("Update decision")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Update decision")).toBeVisible();
  await page.getByLabel("Operating costs grew 17% while revenue grew 8%.").check();
  await page.getByLabel("Update decision").selectOption("revise");
  await page.getByLabel("Revised hypothesis").selectOption("cost-pressure");
  await page.getByRole("button", { name: "Save hypothesis update" }).press("Enter");

  await expect.poll(() => completedUpdate).not.toBeNull();
  expect(completedUpdate).toMatchObject({
    status: "revise",
    previousHypothesisId: "revenue-pressure",
    hypothesisId: "cost-pressure",
    evidenceIds: ["cost-growth"],
    revisionOfResponseId: "hypothesis-1",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
