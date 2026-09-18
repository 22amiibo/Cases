import { describe, expect, it } from "vitest";
import type { LearnerCaseReview } from "@/core/learner-case";
import { buildProgressDashboard } from "@/core/progress-dashboard";
import { createCaseAttempt } from "./attempts";
import type { CaseAttempt, DrillAttempt } from "./repository";
import { MemoryPracticeRepository } from "./memory-repository";
import type { ActivityAttempt } from "@/core/activity";
import type { V3CaseAttempt } from "./v3-repository";

const drillAttempt: DrillAttempt = {
  attemptId: "drill-attempt-1",
  userId: "guest-1",
  drillId: "quant-margin",
  skillId: "quantitative",
  score: 80,
  feedbackCodes: ["check_answer_and_unit"],
  conceptIdsPracticed: ["revenue"],
  completedAt: "2026-01-02T00:00:00.000Z",
};

const caseAttempt: CaseAttempt = {
  attemptId: "case-attempt-1",
  userId: "guest-1",
  caseId: "alpinefit-profitability",
  skillScores: {
    structure: 90,
    prioritization: 70,
    quantitative: 100,
    exhibit: 60,
    synthesis: 50,
  },
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

describe("MemoryPracticeRepository", () => {
  it("round-trips complete V2 evidence without blending it into legacy metadata", async () => {
    const repository = new MemoryPracticeRepository();
    await repository.saveDrillAttempt({
      ...drillAttempt,
      attemptId: "v2-attempt",
      skillId: "clarification",
      drillId: "clarification-v2-1",
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: {
        interactionId: "clarification-v2-1",
        skillId: "clarification",
        scoringVersion: "v2",
        contentVersion: 2,
        eventSchemaVersion: 2,
        scaffoldingLevel: "beginner",
        responses: [{
          responseId: "clarification-r1",
          interactionId: "clarification-v2-1",
          revision: 1,
          revisionOf: null,
          responseKind: "clarification",
          text: "Clarify the target metric and time period.",
          committedAtMs: 1,
        }],
        rubricOutcomes: [{ criterionId: "objective", met: true }],
        diagnostics: [],
      },
      diagnostics: [],
    });

    const [attempt] = await repository.getSkillHistory("guest-1");
    expect(attempt).toMatchObject({
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: { interactionId: "clarification-v2-1" },
    });
  });

  it("returns drill and case skill history for only the requested learner", async () => {
    const repository = new MemoryPracticeRepository();
    await repository.saveDrillAttempt(drillAttempt);
    await repository.saveDrillAttempt({
      ...drillAttempt,
      userId: "someone-else",
      drillId: "quant-other",
    });
    await repository.saveCaseAttempt(caseAttempt);

    const history = await repository.getSkillHistory("guest-1");

    expect(history).toHaveLength(6);
    expect(history.map(({ skillId, score }) => ({ skillId, score }))).toEqual([
      { skillId: "structure", score: 90 },
      { skillId: "prioritization", score: 70 },
      { skillId: "quantitative", score: 100 },
      { skillId: "exhibit", score: 60 },
      { skillId: "synthesis", score: 50 },
      { skillId: "quantitative", score: 80 },
    ]);
    expect(history[0].feedbackCodes).toEqual([
      "strong_cross_exhibit_synthesis",
    ]);
  });

  it("keeps V2 case diagnostics separate from skill evidence", async () => {
    const diagnostic = {
      code: "strong_hypothesis_update" as const,
      source: "system" as const,
      severity: "strength" as const,
      responseId: "hypothesis-2",
    };
    const repository = new MemoryPracticeRepository();
    await repository.saveCaseAttempt({
      ...caseAttempt,
      attemptId: "case-v2",
      skillScores: { structure: 90, synthesis: 60 },
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: null,
      diagnostics: [diagnostic],
    });

    const history = await repository.getSkillHistory("guest-1");
    expect(history).toHaveLength(2);
    expect(history.every(({ diagnostics }) => diagnostics?.length === 0)).toBe(true);
    expect(history.every(({ caseDiagnostics }) =>
      caseDiagnostics?.[0]?.code === "strong_hypothesis_update",
    )).toBe(true);
  });

  it("derives clarification evidence from a real V2 case attempt for Progress", async () => {
    const firstResponse = {
      responseId: "opening-response-1",
      interactionId: "case-opening",
      revision: 1,
      revisionOf: null,
      responseKind: "case_opening",
      text: "Clarify the objective and scope.",
      committedAtMs: 1,
    };
    const diagnostic = {
      code: "strong_opening" as const,
      source: "system" as const,
      severity: "strength" as const,
      responseId: "opening-response-2",
    };
    const events: CaseAttempt["events"] = [{
      type: "case_opening_submitted",
      eventSchemaVersion: 2,
      responses: [
        firstResponse,
        {
          ...firstResponse,
          responseId: "opening-response-2",
          revision: 2,
          revisionOf: firstResponse.responseId,
          text: "Clarify the EBITDA-margin objective, period, and scope.",
          committedAtMs: 2,
        },
      ],
      rubricOutcomes: [{ criterionId: "objective", met: true }],
      diagnostics: [diagnostic],
      questions: [{ questionId: "target-metric", interviewerResponse: "Use EBITDA margin." }],
      authoredComparisonViewed: true,
      atMs: 3,
    }];
    const review: LearnerCaseReview = {
      framework: null,
      exhibitInterpretations: [],
      hypotheses: [],
      generatedResponses: [],
      nodes: [],
      events: [],
      efficientPath: { label: "Cost path", nodeIds: ["costs"] },
      exhibitScoreAvailable: true,
      scores: [{ id: "clarification", label: "Clarification", value: 1 }],
      feedback: [],
    };
    const repository = new MemoryPracticeRepository();
    await repository.saveCaseAttempt(createCaseAttempt({
      attemptId: "case-v2-evidence",
      userId: "guest-1",
      caseId: "alpinefit-profitability",
      review,
      events,
      completedAt: "2026-01-04T00:00:00.000Z",
      contentVersion: 2,
      scaffoldingLevel: "beginner",
    }));

    const history = await repository.getSkillHistory("guest-1");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      attemptType: "case",
      skillId: "clarification",
      learningEvidence: {
        interactionId: "case-opening",
        skillId: "clarification",
        responses: [{ responseId: "opening-response-1" }, { responseId: "opening-response-2" }],
        rubricOutcomes: [{ criterionId: "objective", met: true }],
        diagnostics: [diagnostic],
      },
      diagnostics: [diagnostic],
    });
    expect(buildProgressDashboard(history).v2.skills.find(
      ({ skillId }) => skillId === "clarification",
    )?.evidence).toMatchObject({
      committed: 1,
      reviewed: 1,
      revised: 1,
      transferred: 1,
    });
  });

  it("recovers complete guest attempts from browser session storage", async () => {
    const storage = window.sessionStorage;
    storage.clear();

    const firstRepository = new MemoryPracticeRepository({ storage });
    await firstRepository.saveDrillAttempt(drillAttempt);
    await firstRepository.saveCaseAttempt(caseAttempt);

    const restoredRepository = new MemoryPracticeRepository({ storage });
    const history = await restoredRepository.getSkillHistory("guest-1");

    expect(history).toHaveLength(6);
    expect(storage.getItem("casework:practice-history")).toContain(
      '"type":"clarification_selected"',
    );
  });

  it("does not duplicate an attempt when the same save is retried", async () => {
    const repository = new MemoryPracticeRepository();

    await repository.saveDrillAttempt(drillAttempt);
    await repository.saveDrillAttempt(drillAttempt);
    await repository.saveCaseAttempt(caseAttempt);
    await repository.saveCaseAttempt(caseAttempt);

    await expect(repository.getSkillHistory("guest-1")).resolves.toHaveLength(6);
  });

  it("returns case events in stored order only to the owning learner", async () => {
    const repository = new MemoryPracticeRepository();
    await repository.saveCaseAttempt(caseAttempt);

    await expect(
      repository.getCaseEvents("guest-1", "case-attempt-1"),
    ).resolves.toEqual(caseAttempt.events);
    await expect(
      repository.getCaseEvents("someone-else", "case-attempt-1"),
    ).resolves.toEqual([]);
  });

  it("returns a complete historical case attempt only to its owner", async () => {
    const repository = new MemoryPracticeRepository();
    const historicalAttempt: CaseAttempt = {
      ...caseAttempt,
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      learningEvidence: null,
      diagnostics: [],
    };
    await repository.saveCaseAttempt(historicalAttempt);

    await expect(
      repository.getCaseAttempt("guest-1", "case-attempt-1"),
    ).resolves.toEqual(historicalAttempt);
    await expect(
      repository.getCaseAttempt("someone-else", "case-attempt-1"),
    ).resolves.toBeNull();
  });

  it("round-trips ordered V3 activity attempts and rejects conflicting retries", async () => {
    const storage = window.sessionStorage;
    storage.clear();
    const attempt: ActivityAttempt = {
      attemptId: "activity-attempt-1",
      userId: "guest-1",
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
    const repository = new MemoryPracticeRepository({ storage });
    await repository.saveActivityAttempt(attempt);
    await repository.saveActivityAttempt(attempt);

    await expect(repository.listActivityAttempts("guest-1")).resolves.toEqual([attempt]);
    await expect(repository.getActivityAttempt("guest-1", attempt.attemptId)).resolves.toEqual(attempt);
    await expect(repository.getActivityAttempt("other", attempt.attemptId)).resolves.toBeNull();
    await expect(repository.saveActivityAttempt({
      ...attempt,
      completedAt: "2026-09-18T12:06:00.000Z",
    })).rejects.toThrow(/conflicting/i);
    await expect(
      new MemoryPracticeRepository({ storage }).getActivityAttempt("guest-1", attempt.attemptId),
    ).resolves.toEqual(attempt);
  });

  it("lists owned course evidence without mutable completion counters", async () => {
    const repository = new MemoryPracticeRepository();
    const caseAttempt: V3CaseAttempt = {
      attemptId: "case-v3-1",
      userId: "guest-1",
      caseId: "alpinefit-profitability",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scoringVersion: "v3",
      scaffoldingLevel: null,
      caseMode: "practice",
      completedAt: "2026-09-18T12:30:00.000Z",
      skillScores: {},
      feedbackCodes: [],
      skillEvidence: [],
      diagnostics: [],
      courseContext: {
        courseId: "profitability-v3",
        courseVersion: 1,
        courseStepId: "case",
      },
      events: [],
    };
    await repository.enroll({
      userId: "guest-1",
      courseId: "profitability-v3",
      courseVersion: 1,
      startedAt: "2026-09-18T12:00:00.000Z",
      lastActivityAt: "2026-09-18T12:10:00.000Z",
      lastStepId: "overview",
    });
    await repository.recordLessonViewed({
      eventType: "lesson_viewed",
      userId: "guest-1",
      courseId: "profitability-v3",
      courseVersion: 1,
      courseStepId: "overview",
      lessonId: "profitability-overview-v3",
      lessonVersion: 1,
      occurredAt: "2026-09-18T12:10:00.000Z",
    });
    await repository.saveV3CaseAttempt(caseAttempt);

    await expect(repository.listCourseEvidence("guest-1")).resolves.toMatchObject({
      enrollments: [{ lastStepId: "overview" }],
      lessonEvents: [{ courseStepId: "overview" }],
      caseAttempts: [{ attemptId: "case-v3-1" }],
    });
    await expect(repository.listCourseEvidence("other")).resolves.toEqual({
      enrollments: [],
      lessonEvents: [],
      activityAttempts: [],
      caseAttempts: [],
    });
  });
});
