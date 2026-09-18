import { describe, expect, it } from "vitest";
import type { ActivityAttempt } from "./activity";
import type { SkillAttempt } from "@/data/repository";
import { buildAchievements } from "./progress-achievements";

const activity = (index: number, values: Partial<ActivityAttempt> = {}): ActivityAttempt => ({
  attemptId: `activity-${index}`,
  userId: "user-1",
  activityId: `exhibit-${index}`,
  contentVersion: 1,
  eventSchemaVersion: 3,
  scoringVersion: "v3",
  startedAt: `2026-09-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  completedAt: `2026-09-${String(index + 1).padStart(2, "0")}T12:05:00.000Z`,
  primarySkillId: "exhibit",
  skillEvidence: [],
  diagnostics: [],
  courseContext: null,
  events: [],
  ...values,
});

describe("progress achievements", () => {
  it("derives meaningful milestones from immutable case and activity evidence", () => {
    const history = [{
      attemptId: "case-1",
      attemptType: "case",
      userId: "user-1",
      skillId: "structure",
      score: 80,
      feedbackCodes: [],
      completedAt: "2026-09-10T12:00:00.000Z",
      scoringVersion: "v2",
    }] as SkillAttempt[];
    const activities = [
      ...Array.from({ length: 5 }, (_, index) => activity(index)),
      activity(6, {
        activityId: "hypothesis-1",
        primarySkillId: "hypothesis",
        events: [{
          eventId: "revision",
          type: "hypothesis_committed",
          atMs: 1,
          interactionId: "hypothesis",
          stepId: "evidence-1",
          status: "revise",
          hypothesisId: "cost",
          evidenceIds: ["evidence-1"],
          rationale: "The evidence contradicts the prior hypothesis.",
        }],
      }),
    ];

    const achievements = buildAchievements(history, activities, []);

    expect(achievements.find(({ id }) => id === "first-case")).toMatchObject({ earned: true, progress: 1, goal: 1 });
    expect(achievements.find(({ id }) => id === "five-exhibits")).toMatchObject({ earned: true, progress: 5, goal: 5 });
    expect(achievements.find(({ id }) => id === "evidence-revision")).toMatchObject({ earned: true });
    expect(achievements.find(({ id }) => id === "first-interview-case")).toMatchObject({ earned: false });
  });
});
