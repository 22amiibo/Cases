import { describe, expect, it, vi } from "vitest";
import type { CaseAttempt, DrillAttempt } from "./repository";
import type { ActivityAttempt } from "@/core/activity";
import type { V3CaseAttempt } from "./v3-repository";
import {
  SupabasePracticeRepository,
  type PracticeDatabaseClient,
} from "./supabase-repository";

const drillAttempt: DrillAttempt = {
  attemptId: "00000000-0000-4000-8000-000000000001",
  userId: "user-1",
  drillId: "quant-margin",
  skillId: "quantitative",
  score: 80,
  feedbackCodes: ["check_answer_and_unit"],
  conceptIdsPracticed: ["revenue"],
  completedAt: "2026-01-02T00:00:00.000Z",
};

const caseAttempt: CaseAttempt = {
  attemptId: "00000000-0000-4000-8000-000000000002",
  userId: "user-1",
  caseId: "alpinefit-profitability",
  skillScores: { structure: 90, synthesis: 60 },
  feedbackCodes: ["strong_cross_exhibit_synthesis"],
  events: [
    {
      type: "clarification_selected",
      clarificationId: "clarify-goal",
      atMs: 10,
    },
  ],
  completedAt: "2026-01-03T00:00:00.000Z",
};

const v3CaseAttempt: V3CaseAttempt = {
  attemptId: "00000000-0000-4000-8000-000000000003",
  userId: "user-1",
  caseId: "alpinefit-profitability",
  contentVersion: 2,
  eventSchemaVersion: 2,
  scoringVersion: "v3",
  scaffoldingLevel: "beginner",
  caseMode: "interview",
  completedAt: "2026-01-04T00:00:00.000Z",
  skillScores: { exhibit: 50 },
  feedbackCodes: [],
  skillEvidence: [],
  diagnostics: [],
  courseContext: null,
  events: [{ type: "clarification_selected", clarificationId: "clarify-goal", atMs: 10 }],
};

function client(overrides: Partial<PracticeDatabaseClient> = {}) {
  return {
    insertDrillAttempt: vi.fn().mockResolvedValue(undefined),
    insertCaseAttempt: vi.fn().mockResolvedValue(undefined),
    selectDrillAttempts: vi.fn().mockResolvedValue([]),
    selectCaseAttempts: vi.fn().mockResolvedValue([]),
    selectCaseAttempt: vi.fn().mockResolvedValue(null),
    selectCaseEvents: vi.fn().mockResolvedValue([]),
    insertActivityAttempt: vi.fn().mockResolvedValue(undefined),
    selectActivityAttempts: vi.fn().mockResolvedValue([]),
    selectActivityAttempt: vi.fn().mockResolvedValue(null),
    selectActivityEvents: vi.fn().mockResolvedValue([]),
    insertV3CaseAttempt: vi.fn().mockResolvedValue(undefined),
    selectV3CaseAttempts: vi.fn().mockResolvedValue([]),
    upsertCourseEnrollment: vi.fn().mockResolvedValue(undefined),
    insertCourseStepEvent: vi.fn().mockResolvedValue(undefined),
    selectCourseEnrollments: vi.fn().mockResolvedValue([]),
    selectCourseStepEvents: vi.fn().mockResolvedValue([]),
    ...overrides,
  } satisfies PracticeDatabaseClient;
}

describe("SupabasePracticeRepository", () => {
  it("writes one idempotent V3 case path without a V2 conflict and reads it back", async () => {
    const row = {
      id: v3CaseAttempt.attemptId,
      user_id: v3CaseAttempt.userId,
      case_id: v3CaseAttempt.caseId,
      skill_scores: v3CaseAttempt.skillScores,
      feedback_codes: v3CaseAttempt.feedbackCodes,
      completed_at: v3CaseAttempt.completedAt,
      scoring_version: "v3",
      content_version: 2,
      event_schema_version: 2,
      scaffolding_level: "beginner",
      learning_evidence: null,
      diagnostics: [],
      case_mode: "interview",
      skill_evidence: [],
      course_id: null,
      course_version: null,
      course_step_id: null,
    };
    const savedRows = new Map<string, typeof row>();
    const database = client({
      insertV3CaseAttempt: vi.fn().mockImplementation(async (insert) => {
        savedRows.set(insert.id, { ...row, ...insert });
      }),
      selectV3CaseAttempts: vi.fn().mockImplementation(async () => [...savedRows.values()]),
      selectCaseEvents: vi.fn().mockResolvedValue([{ sequence: 0, event: v3CaseAttempt.events[0] }]),
    });
    const repository = new SupabasePracticeRepository(database);

    await repository.saveV3CaseAttempt(v3CaseAttempt);
    await repository.saveV3CaseAttempt(v3CaseAttempt);

    expect(database.insertV3CaseAttempt).toHaveBeenCalledTimes(2);
    expect(savedRows).toHaveLength(1);
    expect(database.insertV3CaseAttempt).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: v3CaseAttempt.attemptId, scoring_version: "v3" }),
    );
    expect(database.insertV3CaseAttempt).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: v3CaseAttempt.attemptId, scoring_version: "v3" }),
    );
    expect(database.insertCaseAttempt).not.toHaveBeenCalled();
    await expect(repository.listCourseEvidence("user-1")).resolves.toMatchObject({
      caseAttempts: [{ attemptId: v3CaseAttempt.attemptId, caseMode: "interview" }],
    });
  });
  it("writes normalized drill attempts and complete case attempts", async () => {
    const database = client();
    const repository = new SupabasePracticeRepository(database);

    await repository.saveDrillAttempt(drillAttempt);
    await repository.saveCaseAttempt(caseAttempt);

    expect(database.insertDrillAttempt).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "user-1",
      drill_id: "quant-margin",
      skill_id: "quantitative",
      score: 80,
      feedback_codes: ["check_answer_and_unit"],
      concept_ids_practiced: ["revenue"],
      completed_at: "2026-01-02T00:00:00.000Z",
      scoring_version: "v1",
      content_version: null,
      event_schema_version: null,
      scaffolding_level: null,
      learning_evidence: null,
      diagnostics: [],
    });
    expect(database.insertCaseAttempt).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000002",
      user_id: "user-1",
      case_id: "alpinefit-profitability",
      skill_scores: { structure: 90, synthesis: 60 },
      feedback_codes: ["strong_cross_exhibit_synthesis"],
      events: caseAttempt.events,
      completed_at: "2026-01-03T00:00:00.000Z",
      scoring_version: "v1",
      content_version: null,
      event_schema_version: null,
      scaffolding_level: null,
      learning_evidence: null,
      diagnostics: [],
    });
  });

  it("combines signed-in drill and case rows into newest-first skill history", async () => {
    const database = client({
      selectDrillAttempts: vi.fn().mockResolvedValue([
        {
          id: "00000000-0000-4000-8000-000000000001",
          user_id: "user-1",
          skill_id: "quantitative",
          score: 80,
          feedback_codes: ["check_answer_and_unit"],
          completed_at: "2026-01-02T00:00:00.000Z",
        },
      ]),
      selectCaseAttempts: vi.fn().mockResolvedValue([
        {
          id: "00000000-0000-4000-8000-000000000002",
          user_id: "user-1",
          skill_scores: { structure: 90, synthesis: 60 },
          feedback_codes: ["strong_cross_exhibit_synthesis"],
          completed_at: "2026-01-03T00:00:00.000Z",
        },
      ]),
    });
    const repository = new SupabasePracticeRepository(database);

    await expect(repository.getSkillHistory("user-1")).resolves.toEqual([
      {
        attemptId: "00000000-0000-4000-8000-000000000002",
        attemptType: "case",
        userId: "user-1",
        skillId: "structure",
        score: 90,
        feedbackCodes: ["strong_cross_exhibit_synthesis"],
        completedAt: "2026-01-03T00:00:00.000Z",
        scoringVersion: "v1",
        contentVersion: null,
        eventSchemaVersion: null,
        scaffoldingLevel: null,
        learningEvidence: null,
        diagnostics: [],
        caseDiagnostics: [],
      },
      {
        attemptId: "00000000-0000-4000-8000-000000000002",
        attemptType: "case",
        userId: "user-1",
        skillId: "synthesis",
        score: 60,
        feedbackCodes: ["strong_cross_exhibit_synthesis"],
        completedAt: "2026-01-03T00:00:00.000Z",
        scoringVersion: "v1",
        contentVersion: null,
        eventSchemaVersion: null,
        scaffoldingLevel: null,
        learningEvidence: null,
        diagnostics: [],
        caseDiagnostics: [],
      },
      {
        attemptId: "00000000-0000-4000-8000-000000000001",
        attemptType: "drill",
        userId: "user-1",
        skillId: "quantitative",
        score: 80,
        feedbackCodes: ["check_answer_and_unit"],
        completedAt: "2026-01-02T00:00:00.000Z",
        scoringVersion: "v1",
        contentVersion: null,
        eventSchemaVersion: null,
        scaffoldingLevel: null,
        learningEvidence: null,
        diagnostics: [],
      },
    ]);
  });

  it("surfaces persistence failures to the caller", async () => {
    const database = client({
      insertDrillAttempt: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
    });
    const repository = new SupabasePracticeRepository(database);

    await expect(repository.saveDrillAttempt(drillAttempt)).rejects.toThrow(
      "database unavailable",
    );
  });

  it("round-trips valid V2 row metadata and rejects unknown scoring versions", async () => {
    const evidence = {
      interactionId: "clarification-v2-1",
      skillId: "clarification" as const,
      scoringVersion: "v2" as const,
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner" as const,
      responses: [{
        responseId: "clarification-r1",
        interactionId: "clarification-v2-1",
        revision: 1,
        revisionOf: null,
        responseKind: "clarification",
        text: "Clarify the target metric.",
        committedAtMs: 1,
      }],
      rubricOutcomes: [],
      diagnostics: [],
    };
    const database = client({
      selectDrillAttempts: vi.fn().mockResolvedValue([
        {
          id: "valid-v2",
          user_id: "user-1",
          skill_id: "clarification",
          score: 0,
          feedback_codes: [],
          completed_at: "2026-01-04T00:00:00.000Z",
          scoring_version: "v2",
          content_version: 2,
          event_schema_version: 2,
          scaffolding_level: "beginner",
          learning_evidence: evidence,
          diagnostics: [],
        },
        {
          id: "unknown-version",
          user_id: "user-1",
          skill_id: "structure",
          score: 100,
          feedback_codes: [],
          completed_at: "2026-01-05T00:00:00.000Z",
          scoring_version: "v3",
        },
      ]),
    });
    const repository = new SupabasePracticeRepository(database);

    const history = await repository.getSkillHistory("user-1");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      attemptId: "valid-v2",
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: evidence,
    });
  });

  it("derives only present per-skill evidence from stored V2 case events", async () => {
    const diagnostic = {
      code: "strong_hypothesis_update",
      source: "system",
      severity: "strength",
      responseId: "hypothesis-2",
    };
    const database = client({
      selectCaseAttempts: vi.fn().mockResolvedValue([{
        id: "case-v2",
        user_id: "user-1",
        skill_scores: { clarification: 100, structure: 90 },
        feedback_codes: ["strong_hypothesis_update"],
        completed_at: "2026-01-04T00:00:00.000Z",
        scoring_version: "v2",
        content_version: 2,
        event_schema_version: 2,
        scaffolding_level: "beginner",
        learning_evidence: null,
        diagnostics: [diagnostic],
      }]),
      selectCaseEvents: vi.fn().mockResolvedValue([{
        sequence: 0,
        event: {
          type: "case_opening_submitted",
          eventSchemaVersion: 2,
          responses: [{
            responseId: "opening-response",
            interactionId: "case-opening",
            revision: 1,
            revisionOf: null,
            responseKind: "case_opening",
            text: "Clarify the objective and scope.",
            committedAtMs: 1,
          }],
          rubricOutcomes: [{ criterionId: "objective", met: true }],
          diagnostics: [{
            code: "strong_opening",
            source: "system",
            severity: "strength",
            responseId: "opening-response",
          }],
          questions: [{ questionId: "target-metric", interviewerResponse: "Use EBITDA margin." }],
          authoredComparisonViewed: true,
          atMs: 2,
        },
      }]),
    });
    const repository = new SupabasePracticeRepository(database);

    const history = await repository.getSkillHistory("user-1");

    expect(history).toHaveLength(2);
    expect(history.find(({ skillId }) => skillId === "clarification")).toMatchObject({
      learningEvidence: {
        interactionId: "case-opening",
        skillId: "clarification",
        responses: [{ responseId: "opening-response" }],
      },
      diagnostics: [{ code: "strong_opening" }],
    });
    expect(history.find(({ skillId }) => skillId === "structure")).toMatchObject({
      learningEvidence: null,
      diagnostics: [],
    });
    expect(history.every(({ caseDiagnostics }) =>
      caseDiagnostics?.[0]?.code === "strong_hypothesis_update",
    )).toBe(true);
    expect(database.selectCaseEvents).toHaveBeenCalledWith("user-1", "case-v2");
  });

  it("reads valid case events in database sequence order", async () => {
    const database = client({
      selectCaseEvents: vi.fn().mockResolvedValue([
        {
          sequence: 1,
          event: { type: "node_investigated", nodeId: "costs", atMs: 2 },
        },
        {
          sequence: 0,
          event: {
            type: "clarification_selected",
            clarificationId: "clarify-goal",
            atMs: 1,
          },
        },
      ]),
    });
    const repository = new SupabasePracticeRepository(database);

    await expect(repository.getCaseEvents("user-1", caseAttempt.attemptId)).resolves.toEqual([
      {
        type: "clarification_selected",
        clarificationId: "clarify-goal",
        atMs: 1,
      },
      { type: "node_investigated", nodeId: "costs", atMs: 2 },
    ]);
    expect(database.selectCaseEvents).toHaveBeenCalledWith(
      "user-1",
      caseAttempt.attemptId,
    );
  });

  it("reconstructs an owned historical attempt from metadata and ordered events", async () => {
    const database = client({
      selectCaseAttempt: vi.fn().mockResolvedValue({
        id: caseAttempt.attemptId,
        user_id: "user-1",
        case_id: "alpinefit-profitability",
        skill_scores: { structure: 90, synthesis: 60 },
        feedback_codes: ["strong_cross_exhibit_synthesis"],
        completed_at: "2026-01-03T00:00:00.000Z",
        scoring_version: "v2",
        content_version: 2,
        event_schema_version: 2,
        scaffolding_level: "beginner",
        learning_evidence: null,
        diagnostics: [],
      }),
      selectCaseEvents: vi.fn().mockResolvedValue([
        {
          sequence: 1,
          event: { type: "node_investigated", nodeId: "costs", atMs: 2 },
        },
        {
          sequence: 0,
          event: {
            type: "clarification_selected",
            clarificationId: "clarify-goal",
            atMs: 1,
          },
        },
      ]),
    });
    const repository = new SupabasePracticeRepository(database);

    await expect(
      repository.getCaseAttempt("user-1", caseAttempt.attemptId),
    ).resolves.toEqual({
      ...caseAttempt,
      events: [
        {
          type: "clarification_selected",
          clarificationId: "clarify-goal",
          atMs: 1,
        },
        { type: "node_investigated", nodeId: "costs", atMs: 2 },
      ],
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: null,
      diagnostics: [],
    });
    expect(database.selectCaseAttempt).toHaveBeenCalledWith(
      "user-1",
      caseAttempt.attemptId,
    );
  });

  it("rejects a historical attempt when any stored event is malformed", async () => {
    const database = client({
      selectCaseAttempt: vi.fn().mockResolvedValue({
        id: caseAttempt.attemptId,
        user_id: "user-1",
        case_id: "alpinefit-profitability",
        skill_scores: { structure: 90 },
        feedback_codes: [],
        completed_at: "2026-01-03T00:00:00.000Z",
        scoring_version: "v2",
        content_version: 2,
        event_schema_version: 2,
        scaffolding_level: "beginner",
        learning_evidence: null,
        diagnostics: [],
      }),
      selectCaseEvents: vi.fn().mockResolvedValue([
        {
          sequence: 0,
          event: {
            type: "clarification_selected",
            clarificationId: "clarify-goal",
            atMs: 1,
          },
        },
        { sequence: 1, event: { type: "invented", atMs: 2 } },
      ]),
    });
    const repository = new SupabasePracticeRepository(database);

    await expect(
      repository.getCaseAttempt("user-1", caseAttempt.attemptId),
    ).rejects.toThrow();
  });

  it("does not read events when the attempt row is not owned by the learner", async () => {
    const database = client({
      selectCaseAttempt: vi.fn().mockResolvedValue({
        id: caseAttempt.attemptId,
        user_id: "someone-else",
        case_id: "alpinefit-profitability",
        skill_scores: { structure: 90 },
        feedback_codes: [],
        completed_at: "2026-01-03T00:00:00.000Z",
      }),
    });
    const repository = new SupabasePracticeRepository(database);

    await expect(
      repository.getCaseAttempt("user-1", caseAttempt.attemptId),
    ).resolves.toBeNull();
    expect(database.selectCaseEvents).not.toHaveBeenCalled();
  });

  it("skips malformed persisted scores without losing valid history", async () => {
    const database = client({
      selectDrillAttempts: vi.fn().mockResolvedValue([
        {
          id: "bad-row",
          user_id: "user-1",
          skill_id: "invented-skill",
          score: 120,
          feedback_codes: [],
          completed_at: "2026-01-04T00:00:00.000Z",
        },
        {
          id: "valid-row",
          user_id: "user-1",
          skill_id: "quantitative",
          score: 80,
          feedback_codes: ["correct_calculation"],
          completed_at: "2026-01-03T00:00:00.000Z",
        },
      ]),
      selectCaseAttempts: vi.fn().mockResolvedValue([]),
    });
    const repository = new SupabasePracticeRepository(database);

    const history = await repository.getSkillHistory("user-1");

    expect(history).toHaveLength(1);
    expect(history[0].skillId).toBe("quantitative");
  });

  it("writes V3 activity attempts atomically and reads owned events in sequence order", async () => {
    const attempt: ActivityAttempt = {
      attemptId: "00000000-0000-4000-8000-000000000003",
      userId: "user-1",
      activityId: "clarifying-v3",
      contentVersion: 1,
      eventSchemaVersion: 3,
      scoringVersion: "v3",
      startedAt: "2026-09-18T12:00:00.000Z",
      completedAt: "2026-09-18T12:05:00.000Z",
      primarySkillId: "clarification",
      skillEvidence: [],
      diagnostics: [],
      courseContext: null,
      events: [
        { eventId: "start", type: "activity_started", atMs: 0 },
        { eventId: "done", type: "activity_completed", atMs: 10 },
      ],
    };
    const database = client({
      insertActivityAttempt: vi.fn().mockResolvedValue(undefined),
      selectActivityAttempt: vi.fn().mockResolvedValue({
        id: attempt.attemptId,
        user_id: "user-1",
        activity_id: "clarifying-v3",
        content_version: 1,
        event_schema_version: 3,
        scoring_version: "v3",
        primary_skill_id: "clarification",
        skill_evidence: [],
        diagnostics: [],
        course_id: null,
        course_version: null,
        course_step_id: null,
        started_at: attempt.startedAt,
        completed_at: attempt.completedAt,
      }),
      selectActivityEvents: vi.fn().mockResolvedValue([
        { sequence: 1, event: attempt.events[1] },
        { sequence: 0, event: attempt.events[0] },
      ]),
    });
    const repository = new SupabasePracticeRepository(database);

    await repository.saveActivityAttempt(attempt);
    await expect(repository.getActivityAttempt("user-1", attempt.attemptId)).resolves.toEqual(attempt);
    expect(database.insertActivityAttempt).toHaveBeenCalledWith(expect.objectContaining({
      id: attempt.attemptId,
      scoring_version: "v3",
      events: attempt.events,
    }));
  });
});

it("continues an exact enrolled course across repository instances and devices", async () => {
  const { deriveCourseProgress } = await import("@/core/course-progress");
  const { profitabilityCourse } = await import("@/content/courses/profitability-v3");
  const enrollments: Record<string, unknown>[] = [];
  const lessonEvents: Record<string, unknown>[] = [];
  const database = client({
    upsertCourseEnrollment: async e => { enrollments.push({ user_id: e.userId, course_id: e.courseId, course_version: e.courseVersion, started_at: e.startedAt, last_activity_at: e.lastActivityAt, last_step_id: e.lastStepId }); },
    selectCourseEnrollments: async () => enrollments,
    insertCourseStepEvent: async e => { lessonEvents.push({ event_type: e.eventType, user_id: e.userId, course_id: e.courseId, course_version: e.courseVersion, course_step_id: e.courseStepId, lesson_id: e.lessonId, lesson_version: e.lessonVersion, occurred_at: e.occurredAt }); },
    selectCourseStepEvents: async () => lessonEvents,
  });
  const first = new SupabasePracticeRepository(database);
  await first.enroll({ userId: "user-1", courseId: "profitability-v3", courseVersion: 1, startedAt: "2026-09-01T00:00:00Z", lastActivityAt: "2026-09-01T00:00:00Z", lastStepId: "overview" });
  await first.recordLessonViewed({ eventType: "lesson_viewed", userId: "user-1", courseId: "profitability-v3", courseVersion: 1, courseStepId: "overview", lessonId: "profitability-overview-v3", lessonVersion: 1, occurredAt: "2026-09-01T00:00:00Z" });
  const second = new SupabasePracticeRepository(database);
  const evidence = await second.listCourseEvidence("user-1");
  expect(deriveCourseProgress(profitabilityCourse, evidence, "user-1").nextStep?.id).toBe("drivers");
  expect(deriveCourseProgress(profitabilityCourse, evidence, "other").completedStepIds).toEqual([]);
  await expect(second.saveV3CaseAttempt({ ...v3CaseAttempt, courseContext: { courseId: "profitability-v3", courseVersion: 1, courseStepId: "case" } })).rejects.toThrow();
});
