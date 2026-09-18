import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { SkillAttempt } from "@/data/repository";
import ProgressPage from "./page";

const { usePracticeProgress } = vi.hoisted(() => ({
  usePracticeProgress: vi.fn(),
}));

vi.mock("@/components/progress/usePracticeProgress", () => ({
  usePracticeProgress,
}));

beforeEach(() => {
  usePracticeProgress.mockReset();
});

it("lists each V2 case attempt once with a version-safe replay link", () => {
  const shared = {
    attemptId: "case-attempt-1",
    attemptType: "case" as const,
    userId: "user-1",
    caseId: "alpinefit-profitability",
    score: 80,
    feedbackCodes: [],
    completedAt: "2026-09-17T12:00:00.000Z",
    scoringVersion: "v2" as const,
    contentVersion: 2,
    eventSchemaVersion: 2,
    scaffoldingLevel: "beginner" as const,
    learningEvidence: null,
    diagnostics: [],
    caseDiagnostics: [],
  };
  const history: SkillAttempt[] = [
    { ...shared, skillId: "structure" },
    { ...shared, skillId: "synthesis" },
  ];
  usePracticeProgress.mockReturnValue({
    status: "ready",
    history,
    isSignedIn: true,
    retry: vi.fn(),
  });

  render(<ProgressPage />);

  const replay = screen.getByRole("link", {
    name: "Review AlpineFit profitability · V2",
  });
  expect(replay).toHaveAttribute(
    "href",
    "/cases/alpinefit-profitability/review?attemptId=case-attempt-1",
  );
  expect(screen.getAllByText("September 17, 2026")).toHaveLength(1);
});
