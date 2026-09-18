import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillAttempt } from "@/data/repository";
import { HomeRecommendation } from "./HomeRecommendation";

const { progressState } = vi.hoisted(() => ({
  progressState: { current: {} as ReturnTypeShape },
}));

type ReturnTypeShape = {
  status: "loading" | "ready" | "error";
  history: SkillAttempt[];
  retry: () => void;
};

vi.mock("./usePracticeProgress", () => ({
  usePracticeProgress: () => progressState.current,
}));

function attempt(id: string, day: number): SkillAttempt {
  const diagnostic = {
    code: "missing_major_branch" as const,
    source: "system" as const,
    severity: "blocking" as const,
  };
  return {
    attemptId: id,
    attemptType: "drill",
    userId: "guest",
    skillId: "structure",
    score: 0,
    feedbackCodes: [],
    completedAt: `2026-01-0${day}T00:00:00.000Z`,
    scoringVersion: "v2",
    contentVersion: 2,
    eventSchemaVersion: 2,
    scaffoldingLevel: "beginner",
    diagnostics: [diagnostic],
    learningEvidence: {
      interactionId: id,
      skillId: "structure",
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      responses: [{
        responseId: `${id}-response`,
        interactionId: id,
        revision: 1,
        revisionOf: null,
        responseKind: "structure",
        text: "Committed structure",
        committedAtMs: day,
      }],
      rubricOutcomes: [{ criterionId: "branches", met: false }],
      diagnostics: [diagnostic],
    },
  };
}

describe("HomeRecommendation", () => {
  beforeEach(() => {
    progressState.current = { status: "ready", history: [], retry: vi.fn() };
  });

  it("shows one exact versioned baseline rep for empty history", () => {
    render(<HomeRecommendation />);

    expect(
      screen.getByRole("link", { name: /alpinefit opening clarification/i }),
    ).toHaveAttribute(
      "href",
      "/drills/clarification?rep=alpinefit-opening-clarification&version=2",
    );
  });

  it("labels objective evidence and targets the recurring diagnosis", () => {
    progressState.current = {
      status: "ready",
      history: [attempt("one", 1), attempt("two", 2)],
      retry: vi.fn(),
    };
    render(<HomeRecommendation />);

    expect(screen.getByText("Coach feedback")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add the major branch missing/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: /quickcart structure transfer/i }))
      .toHaveAttribute(
        "href",
        "/drills/structure?rep=quickcart-structure-v2&version=2",
      );
  });
});
