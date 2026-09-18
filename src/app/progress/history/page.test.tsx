import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import HistoryPage from "./page";
const { usePracticeProgress } = vi.hoisted(() => ({ usePracticeProgress: vi.fn() }));
vi.mock("@/components/progress/usePracticeProgress", () => ({ usePracticeProgress }));
it("shows unavailable saved work without raw ids and preserves exact review destinations", () => {
  usePracticeProgress.mockReturnValue({ status: "ready", history: [{ attemptId: "old attempt", attemptType: "case", caseId: "missing-secret-id", skillId: "structure", completedAt: "2026-09-01T00:00:00Z" }], activityAttempts: [{ attemptId: "activity-1", activityId: "retired-activity", primarySkillId: "clarification", contentVersion: 99, completedAt: "2026-09-02T00:00:00Z" }], v3CaseAttempts: [], retry: vi.fn() });
  render(<HistoryPage />);
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Review Clarifying practice" })).toHaveAttribute("href", "/practice/attempts/activity-1");
  expect(screen.getByRole("link", { name: "Review Case practice" })).toHaveAttribute("href", "/cases/missing-secret-id/attempts/old%20attempt");
  expect(document.body).not.toHaveTextContent(/missing-secret-id|retired-activity|contentVersion|scoringVersion/);
  expect(screen.getAllByText(/Original practice unavailable/)).toHaveLength(2);
});
it("offers an empty state and a retry for a failed read", () => {
  usePracticeProgress.mockReturnValue({ status: "ready", history: [], activityAttempts: [], v3CaseAttempts: [], retry: vi.fn() });
  const view = render(<HistoryPage />);
  expect(screen.getByText(/Complete a practice activity or case/)).toBeVisible();
  usePracticeProgress.mockReturnValue({ status: "error", history: [], activityAttempts: [], v3CaseAttempts: [], retry: vi.fn() });
  view.rerender(<HistoryPage />);
  expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
});
