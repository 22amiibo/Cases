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
  exhibitScoreAvailable: true,
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
      mode: "practice",
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
      mode: "practice",
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
    expect(screen.getByText("Add the major branch missing from the structure.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      events: [],
      contentVersion: 99,
      mode: "practice",
    });
  });
});

describe("CaseReplay investigation groups", () => {
  it("renders repeated calculation attempts without duplicate review keys", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const calculationStep: LearnerCaseReview["generatedResponses"][number] = {
      kind: "calculation",
      label: "Calculate the annual expense",
      responses: [{
        responseId: "calculation-response",
        interactionId: "calculation-cycle",
        revision: 1,
        revisionOf: null,
        responseKind: "calculation",
        text: "Six clubs times hours times premium.",
        committedAtMs: 1,
      }],
      rubricOutcomes: [],
      diagnostics: [],
      details: ["Answer: 756000 %"],
    };

    render(<CaseReplay review={{
      ...review,
      generatedResponses: [
        calculationStep,
        { ...calculationStep, details: ["Answer: 756000 $"] },
      ],
    }} />);

    expect(screen.getByText("Answer: 756000 %")).toBeVisible();
    expect(screen.getByText("Answer: 756000 $")).toBeVisible();
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
  });

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

describe("chronological debrief", () => {
  beforeEach(() => { vi.restoreAllMocks(); getBrowserPracticeSession.mockReset(); });

  it("keeps raw learner submissions available when the exact content has disappeared", async () => {
    getBrowserPracticeSession.mockResolvedValue({ userId: "user-1", repository: {
      getCaseAttempt: vi.fn().mockResolvedValue({
        attemptId: "gone", userId: "user-1", caseId: "alpinefit-profitability", contentVersion: 99,
        completedAt: "2026-09-17T12:00:00.000Z", feedbackCodes: [],
        events: [{ type: "calculation_submitted", taskId: "math", answer: 17, atMs: 1 }],
      }),
    } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));
    render(<ReviewSession caseId="alpinefit-profitability" attemptId="gone" />);
    await screen.findByRole("heading", { name: "Historical replay unavailable" });
    expect(screen.getByText(/"answer": 17/)).toBeVisible();
  });

  it("links diagnostic claims to the real event, labels reflections, and offers a working skill lab", async () => {
    const { buildCaseReplayTimeline } = await import("@/core/replay-timeline");
    const { getCaseDefinition } = await import("@/content/cases");
    const timeline = buildCaseReplayTimeline(getCaseDefinition("alpinefit-profitability", 2)!, { events: [{
      type: "calculation_submitted", taskId: "overtime-cost", answer: 5, unit: "$", atMs: 3,
      eventSchemaVersion: 2, authoredComparisonViewed: true,
      responses: [{ responseId: "math-1", interactionId: "math", revision: 1, revisionOf: null, responseKind: "calculation", text: "I multiplied hours by the premium.", committedAtMs: 2 }],
      rubricOutcomes: [], diagnostics: [
        { code: "sense_check_missing", source: "self_assessment", severity: "coaching", responseId: "math-1" },
        { code: "strong_quantitative_reasoning", source: "system", severity: "strength", responseId: "math-1" },
      ],
    }] });
    render(<CaseReplay review={{ ...review, timeline }} />);
    expect(screen.getByRole("heading", { name: "Chronological replay" })).toBeVisible();
    const improve = screen.getByRole("region", { name: "What to improve" });
    expect(within(improve).getByText(/Self-assessment/)).toBeVisible();
    expect(within(improve).getByRole("link", { name: "Event 1" })).toHaveAttribute("href", "#case-event-1");
    expect(screen.getByRole("region", { name: "What went well" })).toHaveTextContent("Objective outcome");
    expect(within(screen.getByRole("region", { name: "Practice next" })).getByRole("link", { name: /Case math/ })).toHaveAttribute("href", "/drills/quantitative");
    expect(document.getElementById("case-event-1")).toHaveTextContent("I multiplied hours by the premium.");
  });

  it.each(["practice", "interview"] as const)("honors saved V3 %s mode rather than inferring it from comparison markers", async (caseMode) => {
    const events = [{ type: "clarification_selected", clarificationId: "target-metric", atMs: 1 }];
    getBrowserPracticeSession.mockResolvedValue({ userId: "user-1", isSignedIn: true, repository: {
      getCaseAttempt: vi.fn().mockResolvedValue(null),
      listCourseEvidence: vi.fn().mockResolvedValue({ caseAttempts: [{
        attemptId: "v3-saved", userId: "user-1", caseId: "alpinefit-profitability", contentVersion: 2,
        caseMode, events, scoringVersion: "v3", feedbackCodes: [], completedAt: "2026-09-17T12:00:00.000Z",
      }] }),
    } });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(view)));
    render(<ReviewSession caseId="alpinefit-profitability" attemptId="v3-saved" />);
    await screen.findByRole("heading", { name: "Preserved issue tree" });
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toEqual({ events, contentVersion: 2, mode: caseMode });
  });

  it("clears an earlier review when navigation reaches an inaccessible attempt", async () => {
    const repository = {
      getCaseAttempt: vi.fn().mockResolvedValue({ attemptId: "owned", userId: "user-1", caseId: "alpinefit-profitability", contentVersion: 2, events: [] }),
      listCourseEvidence: vi.fn().mockResolvedValue({ caseAttempts: [] }),
    };
    getBrowserPracticeSession.mockResolvedValue({ userId: "user-1", repository });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(view)));
    const rendered = render(<ReviewSession caseId="alpinefit-profitability" attemptId="owned" />);
    await screen.findByRole("heading", { name: "Preserved issue tree" });
    repository.getCaseAttempt.mockResolvedValue(null);
    rendered.rerender(<ReviewSession caseId="alpinefit-profitability" attemptId="inaccessible" />);
    await screen.findByRole("heading", { name: "No completed case to review" });
    expect(screen.queryByRole("heading", { name: "Preserved issue tree" })).not.toBeInTheDocument();
  });

  it("does not replay another user's attempt from the history fallback", async () => {
    getBrowserPracticeSession.mockResolvedValue({ userId: "user-1", isSignedIn: true, repository: {
      getCaseAttempt: vi.fn().mockResolvedValue(null),
      listCourseEvidence: vi.fn().mockResolvedValue({ caseAttempts: [{
        attemptId: "private", userId: "other-user", caseId: "alpinefit-profitability", contentVersion: 2,
        caseMode: "interview", events: [],
      }] }),
    } });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockClear();
    render(<ReviewSession caseId="alpinefit-profitability" attemptId="private" />);
    expect(await screen.findByRole("heading", { name: "No completed case to review" })).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
