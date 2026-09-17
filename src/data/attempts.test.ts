import { describe, expect, it } from "vitest";
import type { DrillDefinition } from "@/core/schema";
import type { DrillResult } from "@/core/drill-engine";
import type { LearnerCaseReview } from "@/core/learner-case";
import {
  createCaseAttempt,
  createDrillAttempt,
} from "./attempts";

describe("practice attempt mapping", () => {
  it("maps a completed drill result into repository data", () => {
    const definition = {
      id: "priority-1",
      skillId: "prioritization",
      conceptIdsPracticed: ["revenue"],
    } as DrillDefinition;
    const result: DrillResult = {
      skillId: "prioritization",
      pointsEarned: 80,
      pointsPossible: 100,
      feedbackCode: "strong_priority",
      conceptIdsPracticed: ["revenue"],
    };

    expect(
      createDrillAttempt(
        "attempt-1",
        "user-1",
        definition,
        result,
        "2026-01-02T00:00:00.000Z",
      ),
    ).toEqual({
      userId: "user-1",
      attemptId: "attempt-1",
      drillId: "priority-1",
      skillId: "prioritization",
      score: 80,
      feedbackCodes: ["strong_priority"],
      conceptIdsPracticed: ["revenue"],
      completedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("keeps the five trainable case dimensions and normalizes them to 0–100", () => {
    const review = {
      scores: [
        { id: "clarification", label: "Clarification", value: 0.5 },
        { id: "structure", label: "Structure", value: 0.75 },
        { id: "prioritization", label: "Prioritization", value: 1 },
        { id: "quantitative", label: "Quantitative", value: 0.5 },
        { id: "exhibit", label: "Exhibit", value: 0.25 },
        { id: "synthesis", label: "Synthesis", value: 0 },
        { id: "recommendation", label: "Recommendation", value: 1 },
      ],
      feedback: [
        {
          code: "strong_cross_exhibit_synthesis",
          message: "Connected evidence.",
        },
      ],
    } as LearnerCaseReview;
    const events = [
      {
        type: "clarification_selected" as const,
        clarificationId: "clarify-goal",
        atMs: 10,
      },
    ];

    expect(
      createCaseAttempt({
        attemptId: "attempt-2",
        userId: "user-1",
        caseId: "alpinefit-profitability",
        review,
        events,
        completedAt: "2026-01-03T00:00:00.000Z",
      }),
    ).toEqual({
      userId: "user-1",
      attemptId: "attempt-2",
      caseId: "alpinefit-profitability",
      skillScores: {
        structure: 75,
        prioritization: 100,
        quantitative: 50,
        exhibit: 25,
        synthesis: 0,
      },
      feedbackCodes: ["strong_cross_exhibit_synthesis"],
      events,
      completedAt: "2026-01-03T00:00:00.000Z",
    });
  });
});
