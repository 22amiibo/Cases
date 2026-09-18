import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearnerCaseReview, LearnerSessionView } from "@/core/learner-case";
import { CaseReplay, ReviewSession } from "./CaseReplay";

const { getBrowserPracticeSession } = vi.hoisted(() => ({
  getBrowserPracticeSession: vi.fn(),
}));

vi.mock("@/data/browser-practice", () => ({ getBrowserPracticeSession }));

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
    getBrowserPracticeSession.mockReset();
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

  it("replays a signed-in attempt against its stored content version and events", async () => {
    const events = [{
      type: "clarification_selected" as const,
      clarificationId: "clarify-goal",
      atMs: 1,
    }];
    const getCaseAttempt = vi.fn().mockResolvedValue({
      attemptId: "historical-attempt",
      userId: "user-1",
      caseId: "alpinefit-profitability",
      completedAt: "2026-09-17T12:00:00.000Z",
      skillScores: { structure: 90 },
      feedbackCodes: [],
      events,
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: null,
      diagnostics: [],
    });
    getBrowserPracticeSession.mockResolvedValue({
      repository: { getCaseAttempt },
      userId: "user-1",
      isSignedIn: true,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(view), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <ReviewSession
        caseId="alpinefit-profitability"
        attemptId="historical-attempt"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Preserved issue tree" }),
    ).toBeVisible();
    expect(getCaseAttempt).toHaveBeenCalledWith("user-1", "historical-attempt");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      events,
      contentVersion: 2,
    });
  });

  it("shows stored metadata instead of current content when a version is unavailable", async () => {
    const getCaseAttempt = vi.fn().mockResolvedValue({
      attemptId: "unknown-version-attempt",
      userId: "user-1",
      caseId: "alpinefit-profitability",
      completedAt: "2026-09-17T12:00:00.000Z",
      skillScores: { structure: 90 },
      feedbackCodes: ["missing_major_branch"],
      events: [],
      scoringVersion: "v2",
      contentVersion: 99,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: null,
      diagnostics: [],
    });
    getBrowserPracticeSession.mockResolvedValue({
      repository: { getCaseAttempt },
      userId: "user-1",
      isSignedIn: true,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Case version not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <ReviewSession
        caseId="alpinefit-profitability"
        attemptId="unknown-version-attempt"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Historical replay unavailable" }),
    ).toBeVisible();
    expect(screen.getByText("Content version 99")).toBeVisible();
    expect(screen.getByText("missing major branch")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      events: [],
      contentVersion: 99,
    });
  });
});

describe("CaseReplay investigation groups", () => {
  it("groups AlpineFit nodes in authored order while preserving status and prerequisite text", () => {
    render(
      <CaseReplay
        review={{
          ...review,
          nodes: [
            {
              id: "revenue",
              label: "Understand revenue performance",
              prerequisiteNodeIds: [],
              state: "visited",
              displayCategory: "Revenue",
              displayDepth: 0,
            },
            {
              id: "price",
              label: "Check membership pricing",
              prerequisiteNodeIds: ["revenue"],
              state: "unvisited",
              displayCategory: "Revenue",
              displayDepth: 1,
            },
            {
              id: "costs",
              label: "Break down operating costs",
              prerequisiteNodeIds: [],
              state: "critical-found",
              displayCategory: "Operating Costs",
              displayDepth: 0,
            },
            {
              id: "variable_cost",
              label: "Inspect variable costs",
              prerequisiteNodeIds: ["costs"],
              state: "critical-found",
              displayCategory: "Operating Costs",
              displayDepth: 1,
            },
            {
              id: "labor",
              label: "Inspect club labor",
              prerequisiteNodeIds: ["variable_cost"],
              state: "critical-missed",
              displayCategory: "Labor & Staffing",
              displayDepth: 0,
            },
          ],
        }}
      />,
    );

    const revenue = screen.getByRole("region", { name: "Revenue" });
    expect(
      within(revenue).getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "visitedUnderstand revenue performance",
      "unvisitedCheck membership pricingAfter Understand revenue performance",
    ]);
    expect(
      within(screen.getByRole("region", { name: "Operating Costs" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "critical foundBreak down operating costs",
      "critical foundInspect variable costsAfter Break down operating costs",
    ]);
    expect(
      within(screen.getByRole("region", { name: "Labor & Staffing" }))
        .getByText("critical missed"),
    ).toBeVisible();
  });
});
