import { describe, expect, it } from "vitest";
import {
  CourseEnrollmentSchema,
  CourseStepEventSchema,
  V3CaseAttemptSchema,
} from "./v3-repository";

describe("V3 repository contracts", () => {
  it("requires exact V3 case metadata and complete course context", () => {
    const attempt = {
      attemptId: "00000000-0000-4000-8000-000000000003",
      userId: "user-1",
      caseId: "alpinefit-profitability",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scoringVersion: "v3",
      scaffoldingLevel: "beginner",
      caseMode: "practice",
      completedAt: "2026-09-18T12:00:00.000Z",
      skillScores: {},
      feedbackCodes: [],
      skillEvidence: [],
      diagnostics: [],
      courseContext: null,
      events: [],
    };
    expect(V3CaseAttemptSchema.safeParse(attempt).success).toBe(true);
    expect(V3CaseAttemptSchema.safeParse({
      ...attempt,
      courseContext: { courseId: "profitability-v3" },
    }).success).toBe(false);
  });

  it("validates immutable lesson and enrollment evidence", () => {
    expect(CourseStepEventSchema.safeParse({
      eventType: "lesson_viewed",
      userId: "user-1",
      courseId: "profitability-v3",
      courseVersion: 1,
      courseStepId: "profit-basics",
      lessonId: "profitability-basics",
      lessonVersion: 1,
      occurredAt: "2026-09-18T12:00:00.000Z",
    }).success).toBe(true);
    expect(CourseEnrollmentSchema.safeParse({
      userId: "user-1",
      courseId: "profitability-v3",
      courseVersion: 1,
      startedAt: "2026-09-18T12:00:00.000Z",
      lastActivityAt: "2026-09-18T12:00:00.000Z",
      lastStepId: "profit-basics",
    }).success).toBe(true);
  });
});
