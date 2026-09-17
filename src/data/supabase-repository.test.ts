import { describe, expect, it, vi } from "vitest";
import type { CaseAttempt, DrillAttempt } from "./repository";
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

function client(overrides: Partial<PracticeDatabaseClient> = {}) {
  return {
    insertDrillAttempt: vi.fn().mockResolvedValue(undefined),
    insertCaseAttempt: vi.fn().mockResolvedValue(undefined),
    selectDrillAttempts: vi.fn().mockResolvedValue([]),
    selectCaseAttempts: vi.fn().mockResolvedValue([]),
    ...overrides,
  } satisfies PracticeDatabaseClient;
}

describe("SupabasePracticeRepository", () => {
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
    });
    expect(database.insertCaseAttempt).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000002",
      user_id: "user-1",
      case_id: "alpinefit-profitability",
      skill_scores: { structure: 90, synthesis: 60 },
      feedback_codes: ["strong_cross_exhibit_synthesis"],
      events: caseAttempt.events,
      completed_at: "2026-01-03T00:00:00.000Z",
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
      },
      {
        attemptId: "00000000-0000-4000-8000-000000000002",
        attemptType: "case",
        userId: "user-1",
        skillId: "synthesis",
        score: 60,
        feedbackCodes: ["strong_cross_exhibit_synthesis"],
        completedAt: "2026-01-03T00:00:00.000Z",
      },
      {
        attemptId: "00000000-0000-4000-8000-000000000001",
        attemptType: "drill",
        userId: "user-1",
        skillId: "quantitative",
        score: 80,
        feedbackCodes: ["check_answer_and_unit"],
        completedAt: "2026-01-02T00:00:00.000Z",
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
});
