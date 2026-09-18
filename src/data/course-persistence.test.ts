import { expect, it } from "vitest";
import { MemoryPracticeRepository } from "./memory-repository";
import { getCourseDefinition } from "@/content/courses/catalog";
import { deriveCourseProgress } from "@/core/course-progress";
const enrollment = { userId: "guest", courseId: "profitability-v3", courseVersion: 1, startedAt: "2026-09-01T00:00:00Z", lastActivityAt: "2026-09-01T00:00:00Z", lastStepId: "overview" };
const event = { eventType: "lesson_viewed" as const, userId: "guest", courseId: "profitability-v3", courseVersion: 1, courseStepId: "overview", lessonId: "profitability-overview-v3", lessonVersion: 1, occurredAt: "2026-09-01T00:00:00Z" };
it("rejects unknown course enrollment and wrong exact lesson context", async () => {
  const repo = new MemoryPracticeRepository();
  await expect(repo.enroll({ ...enrollment, courseVersion: 99 })).rejects.toThrow();
  await repo.enroll(enrollment);
  await expect(repo.recordLessonViewed({ ...event, lessonId: "structuring" })).rejects.toThrow();
  await repo.recordLessonViewed(event);
  expect(deriveCourseProgress(getCourseDefinition("profitability-v3", 1)!, await repo.listCourseEvidence("guest"), "guest").nextStep?.id).toBe("drivers");
});
it("restores guest evidence from session storage and leaves new sessions empty", async () => {
  const storage = window.sessionStorage; storage.clear();
  const repo = new MemoryPracticeRepository({ storage });
  await repo.enroll(enrollment); await repo.recordLessonViewed(event);
  const restored = new MemoryPracticeRepository({ storage });
  expect(deriveCourseProgress(getCourseDefinition("profitability-v3", 1)!, await restored.listCourseEvidence("guest"), "guest").completedStepIds).toEqual(["overview"]);
  expect((await new MemoryPracticeRepository().listCourseEvidence("guest")).enrollments).toEqual([]);
});
it("rejects saving course attempts without enrollment or with a mismatched step", async () => {
  const repo = new MemoryPracticeRepository();
  const attempt = { attemptId: "a", userId: "guest", activityId: "alpinefit-clarifying-v3", contentVersion: 1, scoringVersion: "v3" as const, eventSchemaVersion: 3 as const, startedAt: "2026-09-01T00:00:00Z", completedAt: "2026-09-01T00:01:00Z", primarySkillId: "clarification" as const, skillEvidence: [], diagnostics: [], events: [], courseContext: { courseId: "profitability-v3", courseVersion: 1, courseStepId: "clarifying" } };
  await expect(repo.saveActivityAttempt(attempt)).rejects.toThrow(/enrollment/i);
  await repo.enroll(enrollment);
  await expect(repo.saveActivityAttempt({ ...attempt, courseContext: { ...attempt.courseContext, courseStepId: "brainstorming" } })).rejects.toThrow();
});

it("treats a lesson retry with a new timestamp as a no-op and preserves the first event", async () => {
  const repo = new MemoryPracticeRepository();
  await repo.enroll(enrollment);
  await repo.recordLessonViewed(event);
  await expect(repo.recordLessonViewed({ ...event, occurredAt: "2026-09-03T00:00:00Z" })).resolves.toBeUndefined();
  expect((await repo.listCourseEvidence("guest")).lessonEvents).toEqual([event]);
});

it("preserves the first enrollment and advances only newer validated course evidence", async () => {
  const repo = new MemoryPracticeRepository();
  await repo.enroll(enrollment);
  const drivers = { ...event, courseStepId: "drivers", lessonId: "profitability-drivers-v3", occurredAt: "2026-09-02T00:00:00Z" };
  await repo.recordLessonViewed(drivers);
  await repo.enroll({ ...enrollment, startedAt: "2026-09-03T00:00:00Z", lastActivityAt: "2026-09-03T00:00:00Z" });
  await repo.recordLessonViewed(event);
  expect((await repo.listCourseEvidence("guest")).enrollments).toEqual([{ ...enrollment, lastActivityAt: drivers.occurredAt, lastStepId: "drivers" }]);
});
