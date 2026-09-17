import { describe, expect, it } from "vitest";
import type { SkillAttempt } from "@/data/repository";
import {
  calculateRollingSkillScore,
  recommendNextPractice,
} from "./progress";

function attempt(
  skillId: SkillAttempt["skillId"],
  score: number,
  sequence: number,
): SkillAttempt {
  return {
    userId: "learner-1",
    skillId,
    score,
    feedbackCodes: [`feedback-${sequence}`],
    completedAt: new Date(Date.UTC(2026, 0, sequence)).toISOString(),
  };
}

describe("calculateRollingSkillScore", () => {
  it("weights the newest five attempts at 1.0 and attempts six through ten at 0.6", () => {
    const history = Array.from({ length: 10 }, (_, index) =>
      attempt("quantitative", index < 5 ? 0 : 100, index + 1),
    );

    expect(calculateRollingSkillScore(history, "quantitative")).toBe(62.5);
  });

  it("uses only the most recent ten attempts for the requested skill", () => {
    const history = [
      attempt("quantitative", 0, 1),
      ...Array.from({ length: 10 }, (_, index) =>
        attempt("quantitative", 100, index + 2),
      ),
      attempt("structure", 0, 20),
    ];

    expect(calculateRollingSkillScore(history, "quantitative")).toBe(100);
    expect(calculateRollingSkillScore(history, "exhibit")).toBeNull();
  });
});

describe("recommendNextPractice", () => {
  it("recommends a diagnostic mix until three skills each have three attempts", () => {
    const history = [
      ...[60, 70, 80].map((score, index) =>
        attempt("structure", score, index + 1),
      ),
      ...[50, 60, 70].map((score, index) =>
        attempt("prioritization", score, index + 4),
      ),
      ...[40, 50].map((score, index) =>
        attempt("quantitative", score, index + 7),
      ),
    ];

    expect(recommendNextPractice(history)).toEqual({
      kind: "diagnostic_mix",
      reason: "insufficient_history",
    });
  });

  it("recommends the weakest skill after enough practice history exists", () => {
    const history = [
      ...[85, 90, 95].map((score, index) =>
        attempt("structure", score, index + 1),
      ),
      ...[35, 45, 40].map((score, index) =>
        attempt("prioritization", score, index + 4),
      ),
      ...[70, 75, 80].map((score, index) =>
        attempt("quantitative", score, index + 7),
      ),
    ];

    expect(recommendNextPractice(history)).toEqual({
      kind: "skill",
      skillId: "prioritization",
      score: 40,
      reason: "weakest_practiced_skill",
    });
  });
});
