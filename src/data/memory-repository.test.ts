import { describe, expect, it } from "vitest";
import type { CaseAttempt, DrillAttempt } from "./repository";
import { MemoryPracticeRepository } from "./memory-repository";

const drillAttempt: DrillAttempt = {
  userId: "guest-1",
  drillId: "quant-margin",
  skillId: "quantitative",
  score: 80,
  feedbackCodes: ["check_answer_and_unit"],
  conceptIdsPracticed: ["revenue"],
  completedAt: "2026-01-02T00:00:00.000Z",
};

const caseAttempt: CaseAttempt = {
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
});
