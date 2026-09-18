import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActivityAttemptRepository } from "@/data/v3-repository";
import { ActivityAttemptReview } from "./ActivityAttemptReview";

function repository(attempt: Awaited<ReturnType<ActivityAttemptRepository["getActivityAttempt"]>>) {
  return {
    saveActivityAttempt: vi.fn(),
    listActivityAttempts: vi.fn(),
    getActivityAttempt: vi.fn().mockResolvedValue(attempt),
  } satisfies ActivityAttemptRepository;
}

describe("ActivityAttemptReview", () => {
  it("loads an owned exact-version attempt and its committed events", async () => {
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
      id: attempt.activityId,
      contentVersion: 1,
      title: "Clarifying",
      phase: "complete",
      takeaway: "Ask a useful question.",
      feedback: { explanation: "Good choice." },
    }), { status: 200 })));
    render(<ActivityAttemptReview attemptId="attempt-1" repository={repository(attempt)} userId="guest-1" />);
    expect(await screen.findByRole("heading", { name: "Clarifying" })).toBeVisible();
    expect(screen.getByText("activity started")).toBeVisible();
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
