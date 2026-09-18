import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import { toLearnerCaseDefinition } from "@/core/learner-case";
import { serializeLearningCycleState } from "@/core/learning-cycle";
import type {
  LearnerCaseDefinition,
  LearnerSessionView,
} from "@/core/learner-case";
import { InvestigationPanel } from "./InvestigationPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const caseDefinition: LearnerCaseDefinition = {
  id: "alpinefit-profitability",
  version: 2,
  title: "AlpineFit's shrinking margin",
  category: "profitability",
  difficulty: "beginner",
  prompt: "Find the margin driver.",
  objective: "Recommend a practical response.",
  clarificationOptions: [],
  openingPrompt: null,
  caseMode: "practice",
  exhibitIds: [],
  scaffoldingLevel: "beginner",
};

const view: LearnerSessionView = {
  caseMode: "practice",
  currentStage: "investigate",
  availableActions: [
    {
      id: "revenue",
      conceptId: "revenue",
      label: "Understand revenue performance",
      displayCategory: "Revenue",
      displayDepth: 0,
      prerequisiteLabels: [],
    },
    {
      id: "costs",
      conceptId: "variable_cost",
      label: "Break down operating costs",
      displayCategory: "Operating Costs",
      displayDepth: 0,
      prerequisiteLabels: [],
    },
    {
      id: "variable_cost",
      conceptId: "variable_cost",
      label: "Inspect variable costs",
      displayCategory: "Operating Costs",
      displayDepth: 1,
      prerequisiteLabels: ["Break down operating costs"],
    },
  ],
  facts: [],
  exhibits: [],
  interpretedExhibitIds: [],
  calculations: [],
  completedCalculationIds: [],
  interviewerResponse: null,
  hypothesis: null,
  synthesis: null,
  recommendationPrompt: null,
  recommendation: null,
  review: null,
};

describe("InvestigationPanel grouped actions", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders available actions by display category in authored order", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(view), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<InvestigationPanel caseDefinition={caseDefinition} />);

    expect(
      await screen.findByRole("heading", { name: "Choose the next question" }),
    ).toBeVisible();
    const costs = screen.getByRole("region", { name: "Operating Costs" });
    expect(
      within(costs).getAllByRole("button").map((button) => button.textContent),
    ).toEqual([
      "Break down operating costs",
      "Inspect variable costsAfter Break down operating costs",
    ]);
    expect(screen.getAllByRole("region", { name: /Revenue|Operating Costs/ }))
      .toHaveLength(2);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledOnce());
  });

  it("links a completed case to its saved replay", async () => {
    window.sessionStorage.setItem(
      "casework:guest-session:alpinefit-profitability",
      JSON.stringify({
        contentVersion: 2,
        events: [{
          type: "framework_submitted",
          eventSchemaVersion: 2,
          branches: [{ conceptId: "revenue", children: [] }],
          priorityConceptId: "revenue",
          rationale: "Start with revenue.",
          atMs: 1,
        }],
        clarificationComplete: true,
        clarificationDraftIds: [],
      }),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...view, currentStage: "complete" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<InvestigationPanel caseDefinition={caseDefinition} />);

    expect(
      await screen.findByRole("link", { name: "Review case replay" }),
    ).toHaveAttribute("href", "/cases/alpinefit-profitability/review");
  });

  it("reloads an empty workspace when practicing a completed case again", async () => {
    window.sessionStorage.setItem(
      "casework:guest-session:alpinefit-profitability",
      JSON.stringify({
        contentVersion: 2,
        events: [{
          type: "framework_submitted",
          eventSchemaVersion: 2,
          branches: [{ conceptId: "revenue", children: [] }],
          priorityConceptId: "revenue",
          rationale: "Start with revenue.",
          atMs: 1,
        }],
        clarificationComplete: true,
        clarificationDraftIds: [],
      }),
    );
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...view, currentStage: "complete" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(view), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<InvestigationPanel caseDefinition={caseDefinition} />);
    await screen.findByRole("heading", { name: "Recommendation recorded" });
    screen.getByRole("button", { name: "Practice case again" }).click();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ events: [] });
  });

  it("clears this case's Practice exhibit state when restarting an expired workspace", async () => {
    const user = userEvent.setup();
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    const authored = definition.exhibits.find(({ id }) => id === "cost-category")!.interpretation!;
    const cycle = serializeLearningCycleState({
      interactionId: authored.interactionId,
      phase: "complete",
      responses: [{
        responseId: "old-response",
        interactionId: authored.interactionId,
        revision: 1,
        revisionOf: null,
        responseKind: authored.responseKind,
        text: "The prior run's interpretation.",
        committedAtMs: 1,
      }],
      reveal: authored,
      assessments: [{
        responseId: "old-response",
        outcomes: authored.criteria.map(({ id }) => ({ criterionId: id, met: true })),
      }],
      diagnostics: [],
    });
    const practiceKey = "casework:exhibit-cycle:cost-category";
    const interviewKey = `${practiceKey}:alpinefit-profitability:interview`;
    const otherCaseKey = "casework:exhibit-cycle:other-case-exhibit";
    const insights = JSON.stringify([{ id: "old-insight", label: "The prior run's insight." }]);
    for (const key of [practiceKey, interviewKey, otherCaseKey]) {
      window.sessionStorage.setItem(key, cycle);
      window.sessionStorage.setItem(`${key}:insights`, insights);
    }
    window.sessionStorage.setItem(
      "casework:guest-session:alpinefit-profitability",
      JSON.stringify({ contentVersion: 2, events: "invalid" }),
    );
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(view), { status: 200 }),
    );

    render(<InvestigationPanel caseDefinition={toLearnerCaseDefinition(definition)} />);
    expect(await screen.findByRole("heading", { name: "This case session expired" })).toBeVisible();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Start a fresh case" }));
    expect(await screen.findByRole("heading", { name: "Choose the next question" })).toBeVisible();

    expect(window.sessionStorage.getItem(practiceKey)).toBeNull();
    expect(window.sessionStorage.getItem(`${practiceKey}:insights`)).toBeNull();
    for (const key of [interviewKey, otherCaseKey]) {
      expect(window.sessionStorage.getItem(key)).toBe(cycle);
      expect(window.sessionStorage.getItem(`${key}:insights`)).toBe(insights);
    }
  });
});
