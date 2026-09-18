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
