import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearnerCaseReview, LearnerSessionView } from "@/core/learner-case";
import { ReviewSession } from "./CaseReplay";

const review: LearnerCaseReview = {
  framework: {
    branches: [
      {
        conceptId: "variable_cost",
        children: [
          { conceptId: "labor", children: [] },
          { conceptId: "materials", children: [] },
        ],
      },
      { conceptId: "revenue", children: [] },
    ],
    priorityConceptId: "labor",
    rationale: "Labor is both material and actionable.",
    source: "v2_hierarchy",
  },
  exhibitInterpretations: [],
  hypotheses: [],
  generatedResponses: [],
  nodes: [],
  events: [],
  efficientPath: { label: "Direct path", nodeIds: [] },
  scores: [],
  feedback: [],
};

const view = { review } as LearnerSessionView;

describe("ReviewSession framework recovery", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("reloads a nested V2 submission and renders the same hierarchy in review", async () => {
    const frameworkEvent = {
      type: "framework_submitted" as const,
      eventSchemaVersion: 2 as const,
      branches: review.framework?.branches,
      priorityConceptId: "labor",
      rationale: "Labor is both material and actionable.",
      atMs: 12,
    };
    window.sessionStorage.setItem(
      "casework:guest-session:alpinefit-profitability",
      JSON.stringify({
        contentVersion: 2,
        events: [frameworkEvent],
        clarificationComplete: true,
        clarificationDraftIds: [],
      }),
    );
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(view), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<ReviewSession caseId="alpinefit-profitability" />);

    expect(
      await screen.findByRole("heading", { name: "Preserved issue tree" }),
    ).toBeVisible();
    expect(screen.getByText("Labor is both material and actionable.")).toBeVisible();
    const tree = screen.getByRole("heading", { name: "Preserved issue tree" })
      .parentElement;
    expect(tree).not.toBeNull();
    const items = within(tree as HTMLElement).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "variable costlabor · starting prioritymaterials",
      "labor · starting priority",
      "materials",
      "revenue",
    ]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      events: [frameworkEvent],
      contentVersion: 2,
    });
  });
});
