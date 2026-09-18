import { expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SupabaseDatabaseClient, SupabasePracticeRepository } from "./supabase-repository";
import { MemoryPracticeRepository } from "./memory-repository";
import type { V3Repository, CourseEnrollment, CourseStepEvent, V3CaseAttempt } from "./v3-repository";
import type { ActivityAttempt } from "@/core/activity";

// Exercise the real Supabase adapter's HTTP filters and conflict policy in memory.
function signedInRepository() {
  const tables: Record<string, Record<string, unknown>[]> = {};
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const table = url.pathname.split("/").at(-1)!;
    if (url.pathname.includes("/rpc/")) {
      const body = await request.json();
      const kind = table === "save_activity_attempt_v3" ? "activity" : "case";
      const row = Object.fromEntries(Object.entries(body).map(([key, value]) => [key.slice(2), value]));
      row.id = row.attempt_id; row.scoring_version = "v3";
      const attempts = tables[`${kind}_attempts`] ??= [];
      if (!attempts.some(a => a.id === row.id)) {
        attempts.push(row);
        (tables[`${kind}_events`] ??= []).push(...body.p_events.map((event: unknown, sequence: number) => ({ user_id: row.user_id, [`${kind}_attempt_id`]: row.id, event, sequence })));
      }
      return Response.json(null);
    }
    const rows = tables[table] ??= [];
    const matches = (row: Record<string, unknown>) => [...url.searchParams].every(([field, condition]) => !condition.startsWith("eq.") && !condition.startsWith("lt.") || (condition.startsWith("eq.") ? String(row[field]) === condition.slice(3) : Date.parse(String(row[field])) < Date.parse(condition.slice(3))));
    if (request.method === "POST") {
      const row = await request.json();
      const keys = url.searchParams.get("on_conflict")!.split(",");
      const index = rows.findIndex(existing => keys.every(key => existing[key] === row[key]));
      if (index < 0) rows.push(row);
      else if (!request.headers.get("prefer")?.includes("resolution=ignore-duplicates")) rows[index] = row;
      return Response.json(null);
    }
    if (request.method === "PATCH") {
      const update = await request.json();
      rows.filter(matches).forEach(row => Object.assign(row, update));
      return Response.json(null);
    }
    return Response.json(rows.filter(matches));
  };
  return new SupabasePracticeRepository(new SupabaseDatabaseClient(createClient("http://course.test", "anon", { db: { retry: false }, global: { fetch }, accessToken: async () => "test-token" })));
}
const enrollment: CourseEnrollment = { userId: "learner", courseId: "profitability-v3", courseVersion: 1, startedAt: "2026-09-01T00:00:00.000Z", lastActivityAt: "2026-09-01T00:00:00.000Z", lastStepId: "overview" };
const lesson: CourseStepEvent = { eventType: "lesson_viewed", userId: "learner", courseId: "profitability-v3", courseVersion: 1, courseStepId: "drivers", lessonId: "profitability-drivers-v3", lessonVersion: 1, occurredAt: "2026-09-02T00:00:00.000Z" };
const activity: ActivityAttempt = { attemptId: "activity", userId: "learner", activityId: "alpinefit-clarifying-v3", contentVersion: 1, scoringVersion: "v3", eventSchemaVersion: 3, startedAt: "2026-09-03T00:00:00.000Z", completedAt: "2026-09-03T00:01:00.000Z", primarySkillId: "clarification", skillEvidence: [], diagnostics: [], courseContext: { courseId: "profitability-v3", courseVersion: 1, courseStepId: "clarifying" }, events: [{ type: "activity_completed", eventId: "done", atMs: 1 }] };
const capstone: V3CaseAttempt = { attemptId: "case", userId: "learner", caseId: "alpinefit-profitability", contentVersion: 2, eventSchemaVersion: 2, scoringVersion: "v3", scaffoldingLevel: "beginner", caseMode: "practice", completedAt: "2026-09-04T00:00:00.000Z", skillScores: {}, feedbackCodes: [], skillEvidence: [], diagnostics: [], courseContext: { courseId: "profitability-v3", courseVersion: 1, courseStepId: "case" }, events: [{ type: "recommendation_submitted", decisionId: "decision", evidenceIds: ["evidence"], riskId: "risk", nextStepId: "next", atMs: 1 }] };
const current = async (repo: V3Repository) => (await repo.listCourseEvidence("learner")).enrollments[0];

for (const [name, create] of [["guest", () => new MemoryPracticeRepository()], ["signed-in", signedInRepository]] as const) {
  it(`${name}: duplicate enrollment and logical lesson retries preserve the first history`, async () => {
    const repo = create();
    await repo.enroll(enrollment);
    await Promise.all([repo.enroll({ ...enrollment, startedAt: "2026-09-05T00:00:00.000Z", lastActivityAt: "2026-09-05T00:00:00.000Z" }), repo.recordLessonViewed(lesson)]);
    await repo.recordLessonViewed({ ...lesson, occurredAt: "2026-09-06T00:00:00.000Z" });
    expect((await repo.listCourseEvidence("learner")).lessonEvents).toEqual([lesson]);
    expect(await current(repo)).toEqual({ ...enrollment, lastActivityAt: lesson.occurredAt, lastStepId: "drivers" });
  });
  it(`${name}: racing first enrollments insert once and keep the winner's startedAt`, async () => {
    const repo = create();
    await Promise.all([repo.enroll(enrollment), repo.enroll({ ...enrollment, startedAt: "2026-09-08T00:00:00.000Z", lastActivityAt: "2026-09-08T00:00:00.000Z" })]);
    const rows = (await repo.listCourseEvidence("learner")).enrollments;
    expect(rows).toEqual([enrollment]);
  });
  it(`${name}: lesson, activity, and Practice capstone saves advance metadata without stale evidence or retries regressing it`, async () => {
    const repo = create(); await repo.enroll(enrollment);
    await repo.recordLessonViewed(lesson);
    expect(await current(repo)).toMatchObject({ lastActivityAt: lesson.occurredAt, lastStepId: "drivers" });
    await repo.saveActivityAttempt(activity);
    expect(await current(repo)).toMatchObject({ lastActivityAt: activity.completedAt, lastStepId: "clarifying" });
    await repo.saveV3CaseAttempt(capstone);
    await Promise.all([repo.saveActivityAttempt(activity), repo.enroll({ ...enrollment, startedAt: "2026-09-09T00:00:00.000Z" }), repo.recordLessonViewed({ ...lesson, occurredAt: "2026-09-10T00:00:00.000Z" })]);
    expect(await current(repo)).toEqual({ ...enrollment, lastActivityAt: capstone.completedAt, lastStepId: "case" });
    await repo.saveActivityAttempt({ ...activity, attemptId: "standalone", courseContext: null, completedAt: "2026-09-11T00:00:00.000Z" });
    await expect(repo.saveActivityAttempt({ ...activity, attemptId: "wrong", courseContext: { ...activity.courseContext!, courseVersion: 2 } })).rejects.toThrow();
    await expect(repo.recordLessonViewed({ ...lesson, lessonVersion: 2 })).rejects.toThrow();
    await repo.saveActivityAttempt({ ...activity, attemptId: "incomplete", completedAt: "2026-09-12T00:00:00.000Z", events: [] });
    await repo.enroll({ ...enrollment, userId: "other" });
    await repo.recordLessonViewed({ ...lesson, userId: "other", occurredAt: "2026-09-13T00:00:00.000Z" });
    expect(await current(repo)).toMatchObject({ lastActivityAt: capstone.completedAt, lastStepId: "case" });
  });
}
