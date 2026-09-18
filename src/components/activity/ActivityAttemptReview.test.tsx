import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ActivityAttemptRepository } from "@/data/v3-repository";
import { ActivityAttemptReview } from "./ActivityAttemptReview";
import { MemoryPracticeRepository } from "@/data/memory-repository";

function repository(attempt: Awaited<ReturnType<ActivityAttemptRepository["getActivityAttempt"]>>) {
  return {
    saveActivityAttempt: vi.fn(),
    listActivityAttempts: vi.fn(),
    getActivityAttempt: vi.fn().mockResolvedValue(attempt),
  } satisfies ActivityAttemptRepository;
}

describe("ActivityAttemptReview", () => {
  it.each(["A", "B"])("rejects a direct saved-attempt URL for %s when the other user owns it", async userId => {
    const saved = new MemoryPracticeRepository();
    await saved.saveActivityAttempt({
      attemptId: "private-attempt", userId: userId === "A" ? "B" : "A",
      activityId: "alpinefit-clarifying-v3", contentVersion: 1,
      eventSchemaVersion: 3, scoringVersion: "v3", primarySkillId: "clarification",
      startedAt: "2026-09-18T12:00:00.000Z", completedAt: "2026-09-18T12:02:00.000Z",
      skillEvidence: [], diagnostics: [], courseContext: null, events: [],
    });
    render(<ActivityAttemptReview attemptId="private-attempt" repository={saved} userId={userId} />);
    expect(await screen.findByRole("heading", { name: "Attempt unavailable" })).toBeVisible();
    expect(screen.queryByText("Saved decisions")).toBeNull();
  });
  it("loads an owned exact-version attempt and its committed events", async () => {
    const user = userEvent.setup();
    const attempt = {
      attemptId: "attempt-1",
      userId: "guest-1",
      activityId: "alpinefit-clarifying-v3",
      contentVersion: 1,
      eventSchemaVersion: 3 as const,
      scoringVersion: "v3" as const,
      startedAt: "2026-09-18T12:00:00.000Z",
      completedAt: "2026-09-18T12:02:00.000Z",
      primarySkillId: "clarification" as const,
      skillEvidence: [],
      diagnostics: [],
      courseContext: null,
      events: [{ eventId: "start", type: "activity_started" as const, atMs: 0 }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      review: {
        title: "Clarifying",
        classification: "Strong",
        performance: { earned: 1, total: 1, label: "1 of 1 check" },
        strengths: ["You chose a decision-relevant question."],
        improvements: [],
        principle: "Clarify the decision first.",
        nextAction: "Use the answer to focus the analysis.",
        takeaway: "Ask a useful question.",
        steps: [{ label: "Decision", learnerAnswer: "Clarify the objective", assessment: "Strong", strongAnswer: "Clarify the objective" }],
      },
    }), { status: 200 })));
    render(<ActivityAttemptReview attemptId="attempt-1" repository={repository(attempt)} userId="guest-1" />);
    expect(await screen.findByRole("heading", { name: "Clarifying" })).toBeVisible();
    expect(screen.getByText("1 of 1 check")).toBeVisible();
    await user.click(screen.getByText("Review answers"));
    expect(screen.getByText("Clarify the objective")).toBeVisible();
    expect(screen.queryByText("activity started")).not.toBeInTheDocument();
  });

  it("shows a safe unavailable state for missing ownership or content", async () => {
    render(<ActivityAttemptReview attemptId="missing" repository={repository(null)} userId="guest-1" />);
    expect(await screen.findByRole("heading", { name: "Attempt unavailable" })).toBeVisible();
  });

  it("preserves the event history message when its exact content version is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    render(<ActivityAttemptReview
      attemptId="old-attempt"
      repository={repository({
        attemptId: "old-attempt",
        userId: "guest-1",
        activityId: "retired-activity",
        contentVersion: 1,
        eventSchemaVersion: 3,
        scoringVersion: "v3",
        startedAt: "2026-09-18T12:00:00.000Z",
        completedAt: "2026-09-18T12:02:00.000Z",
        primarySkillId: "clarification",
        skillEvidence: [],
        diagnostics: [],
        courseContext: null,
        events: [],
      })}
      userId="guest-1"
    />);
    expect(await screen.findByRole("heading", { name: "Historical content unavailable" })).toBeVisible();
  });
});
