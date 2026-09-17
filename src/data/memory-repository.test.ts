import { describe, expect, it } from "vitest";
import type { CaseAttempt, DrillAttempt } from "./repository";
import { MemoryPracticeRepository } from "./memory-repository";

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
});
