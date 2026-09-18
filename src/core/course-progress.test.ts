import { describe, expect, it } from "vitest";
import { getCourseDefinition } from "@/content/courses";
import { getLessonDefinition } from "@/content/lessons/index";
import { deriveCourseProgress, validateCourseContext, courseStepHref, currentCourseStep } from "./course-progress";
import type { CourseEvidence } from "@/data/v3-repository";
import type { ActivityAttempt } from "./activity";
const course = () => getCourseDefinition("profitability-v3", 1)!;
const context = (step: string) => ({ courseId: "profitability-v3", courseVersion: 1, courseStepId: step });
const evidence = (): CourseEvidence => ({ enrollments: [{ userId: "guest", courseId: "profitability-v3", courseVersion: 1, startedAt: "2026-09-01T00:00:00Z", lastActivityAt: "2026-09-01T00:00:00Z", lastStepId: "overview" }], lessonEvents: [], activityAttempts: [], caseAttempts: [] });
describe("Profitability course", () => {
  it("publishes exactly nine immutable resource versions and backward compatible practice", () => {
    expect(course()?.steps.map(s => [s.resource.type, s.resource.id, s.resource.contentVersion])).toEqual([
      ["lesson", "profitability-overview-v3", 1], ["lesson", "profitability-drivers-v3", 1],
      ["activity", "alpinefit-clarifying-v3", 1], ["activity", "alpinefit-brainstorming-v3", 1],
      ["lesson", "structuring", 2], ["lesson", "quantitative-implication", 2],
      ["activity", "alpinefit-exhibit-v3", 1], ["activity", "alpinefit-hypothesis-v3", 1], ["case", "alpinefit-profitability", 2],
    ]);
    expect(getLessonDefinition("profitability-overview-v3", 1)?.practice).toEqual({ activityId: "alpinefit-clarifying-v3", contentVersion: 1 });
    expect(getLessonDefinition("profitability-drivers-v3", 1)?.practice).toEqual({ activityId: "alpinefit-brainstorming-v3", contentVersion: 1 });
    expect(getLessonDefinition("profitability-overview-v3", 2)).toBeUndefined();
    expect(getLessonDefinition("structuring", 2)?.practice).toEqual({ drillId: "alpinefit-structure-v2", contentVersion: 2 });
  });
  it("counts only exact course-context evidence and one named step", () => {
    const data = evidence();
    data.lessonEvents.push({ eventType: "lesson_viewed", userId: "guest", ...context("overview"), lessonId: "profitability-overview-v3", lessonVersion: 1, occurredAt: "2026-09-02T00:00:00Z" });
    const attempt = { attemptId: "a", userId: "guest", activityId: "alpinefit-clarifying-v3", contentVersion: 1, scoringVersion: "v3", eventSchemaVersion: 3, startedAt: "2026-09-02T00:00:00Z", completedAt: "2026-09-02T00:01:00Z", primarySkillId: "clarification", skillEvidence: [], diagnostics: [], courseContext: null, events: [{ type: "activity_completed", eventId: "done", atMs: 1 }] } as ActivityAttempt;
    data.activityAttempts.push(attempt);
    expect(deriveCourseProgress(course(), data, "guest").completedStepIds).toEqual(["overview"]);
    data.activityAttempts[0] = { ...attempt, courseContext: context("clarifying") };
    expect(deriveCourseProgress(course(), data, "guest").completedStepIds).toEqual(["overview", "clarifying"]);
    expect(deriveCourseProgress(course(), data, "other").completedStepIds).toEqual([]);
    for (const change of [{ contentVersion: 2 }, { courseContext: context("brainstorming") }, { courseContext: { ...context("clarifying"), courseVersion: 2 } }, { events: [] }]) {
      data.activityAttempts[0] = { ...attempt, courseContext: context("clarifying"), ...change };
      expect(deriveCourseProgress(course(), data, "guest").completedStepIds).toEqual(["overview"]);
    }
    expect(currentCourseStep([course()], data, "guest")?.href).toContain("step=drivers");
  });
  it("requires completed Practice capstone evidence", () => {
    const data = evidence();
    data.caseAttempts.push({ attemptId: "c", userId: "guest", caseId: "alpinefit-profitability", contentVersion: 2, scoringVersion: "v3", eventSchemaVersion: 2, scaffoldingLevel: "beginner", caseMode: "practice", completedAt: "2026-09-02T00:00:00Z", skillScores: {}, feedbackCodes: [], skillEvidence: [], diagnostics: [], courseContext: context("case"), events: [{ type: "recommendation_submitted" } as never] });
    expect(deriveCourseProgress(course(), data, "guest").completedStepIds).toEqual(["case"]);
    data.caseAttempts[0].caseMode = "interview";
    expect(deriveCourseProgress(course(), data, "guest").completedStepIds).toEqual([]);
  });
  it("rejects arbitrary or mismatched course context and preserves exact URLs", () => {
    const resource = course().steps[2].resource;
    expect(validateCourseContext(context("clarifying"), resource)).toEqual(context("clarifying"));
    for (const invalid of [context("drivers"), { ...context("clarifying"), courseVersion: 99 }, { ...context("clarifying"), courseId: "fake" }]) {
      expect(() => validateCourseContext(invalid, resource)).toThrow();
    }
    expect(() => validateCourseContext(context("case"), { type: "case", id: "alpinefit-profitability", contentVersion: 2, mode: "interview" })).toThrow();
    expect(courseStepHref(course(), course().steps[8])).toBe("/cases/alpinefit-profitability?version=2&mode=practice&course=profitability-v3&courseVersion=1&step=case");
  });
});

it("permits existing retired enrollments but never new ones", async () => {
  const { validateEnrollment } = await import("./course-progress");
  const retired = { ...course(), status: "retired" as const };
  expect(() => validateEnrollment(evidence().enrollments[0], false, retired)).toThrow();
  expect(() => validateEnrollment(evidence().enrollments[0], true, retired)).not.toThrow();
  expect(deriveCourseProgress(retired, evidence(), "guest").enrollment).toBeDefined();
});
it("links the completed capstone rather than a newer incomplete case record", () => {
  const data = evidence();
  const base = { attemptId: "complete", userId: "guest", caseId: "alpinefit-profitability", contentVersion: 2, scoringVersion: "v3" as const, eventSchemaVersion: 2 as const, scaffoldingLevel: "beginner" as const, caseMode: "practice" as const, completedAt: "2026-09-02T00:00:00Z", skillScores: {}, feedbackCodes: [], skillEvidence: [], diagnostics: [], courseContext: context("case"), events: [{ type: "recommendation_submitted" } as never] };
  data.caseAttempts = [base, { ...base, attemptId: "incomplete", completedAt: "2026-09-03T00:00:00Z", events: [] }];
  expect(deriveCourseProgress(course(), data, "guest").capstone?.attemptId).toBe("complete");
});
