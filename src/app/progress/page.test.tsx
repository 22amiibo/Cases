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
    "/cases/alpinefit-profitability/attempts/case-attempt-1",
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

it("shows five ordered areas and current evidence separately from earlier results", () => {
  usePracticeProgress.mockReturnValue({ status: "ready", history: [], activityAttempts: [], v3CaseAttempts: [], localRuns: [], retry: vi.fn() });
  render(<ProgressPage />);
  const headings = screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
  expect(headings.slice(0, 5)).toEqual(["Continue", "Recommended next", "Quick practice", "Skills snapshot", "Recent activity"]);
  expect(screen.getByRole("link", { name: "View all activity" })).toHaveAttribute("href", "/progress/history");
  expect(screen.getAllByText("Not started").length).toBeGreaterThanOrEqual(10);
  expect(document.body).not.toHaveTextContent(/scoringVersion|self_assessment|composite|readiness score/i);
});
it("puts a saved unfinished activity ahead of an unpracticed recommendation", () => {
  usePracticeProgress.mockReturnValue({ status: "ready", history: [], activityAttempts: [], v3CaseAttempts: [], localRuns: [["casework:v3-activity:alpinefit-clarifying-v3:1", JSON.stringify({ attemptId: "run", startedAt: "2026-09-01T00:00:00.000Z", events: [{ eventId: "start", type: "activity_started", atMs: 0 }] })]], retry: vi.fn() });
  render(<ProgressPage />);
  expect(within(screen.getByRole("region", { name: "Recommended next" })).getByRole("link")).toHaveAttribute("href", "/practice/activities/alpinefit-clarifying-v3?version=1");
  expect(screen.getByText(/Your unfinished practice is saved/)).toBeVisible();
});
it("includes current full cases in case history and never renders a missing case id", () => {
  usePracticeProgress.mockReturnValue({ status: "ready", history: [], activityAttempts: [], localRuns: [], v3CaseAttempts: [{ attemptId: "full-case", caseId: "missing-raw-case-id", contentVersion: 99, scoringVersion: "v3", completedAt: "2026-09-01T00:00:00Z", skillEvidence: [], diagnostics: [], events: [] }], retry: vi.fn() });
  render(<ProgressPage />);
  expect(within(screen.getByRole("region", { name: "Case history" })).getByRole("link", { name: "Review Case practice" })).toHaveAttribute("href", "/cases/missing-raw-case-id/attempts/full-case");
  expect(document.body).not.toHaveTextContent("missing-raw-case-id");
});
