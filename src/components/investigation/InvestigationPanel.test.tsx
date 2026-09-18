import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  scaffoldingLevel: "beginner",
};

const view: LearnerSessionView = {
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
});
