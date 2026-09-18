import { render, screen, within } from "@testing-library/react";
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
    activityAttempts: [],
    v3CaseAttempts: [],
    isSignedIn: true,
    retry: vi.fn(),
  });

  render(<ProgressPage />);

  const replay = screen.getByRole("link", {
    name: "Review AlpineFit profitability",
  });
  expect(replay).toHaveAttribute(
    "href",
    "/cases/alpinefit-profitability/review?attemptId=case-attempt-1",
  );
  expect(within(screen.getByRole("region", { name: "Case history" })).getAllByText("September 17, 2026")).toHaveLength(1);
});

it("uses learner-facing coaching language and prioritizes the progress sections", () => {
  const history: SkillAttempt[] = [{
    attemptId: "quant-1",
    attemptType: "drill",
    userId: "user-1",
    skillId: "quantitative",
    score: 0,
    feedbackCodes: ["unit_error"],
    completedAt: "2026-09-17T12:00:00.000Z",
    scoringVersion: "v2",
    contentVersion: 2,
    eventSchemaVersion: 2,
    scaffoldingLevel: "intermediate",
    learningEvidence: null,
    diagnostics: [{ code: "unit_error", source: "system", severity: "coaching" }],
    caseDiagnostics: [],
  }];
  usePracticeProgress.mockReturnValue({
    status: "ready",
    history,
    activityAttempts: [],
    v3CaseAttempts: [],
    isSignedIn: true,
    retry: vi.fn(),
  });

  render(<ProgressPage />);

  expect(screen.getByRole("heading", { name: "Recommended next" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Skills" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Recent activity" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Case history" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Achievements" })).toBeVisible();
  expect(screen.getByText("State the correct unit with your answer.")).toBeVisible();
  expect(document.body).not.toHaveTextContent(/V2 ATTEMPTS|SELF-ASSESSED|SYSTEM CHECK|unit_error|reduced scaffolding/i);
});
