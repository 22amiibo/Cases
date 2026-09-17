import { describe, expect, it } from "vitest";
import type { SkillAttempt } from "@/data/repository";
import {
  buildProgressDashboard,
  buildRecommendedSession,
  skillReadiness,
} from "./progress-dashboard";

function attempt(
  attemptId: string,
  skillId: SkillAttempt["skillId"],
  score: number,
  day: number,
  feedbackCodes: string[] = [],
): SkillAttempt {
  return {
    attemptId,
    attemptType: attemptId.startsWith("case") ? "case" : "drill",
    userId: "guest",
    skillId,
    score,
    feedbackCodes,
    completedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
  };
}

describe("skillReadiness", () => {
  it.each([
    [40, "Needs work"],
    [50, "Developing"],
    [70, "Interview ready"],
    [85, "Strong"],
    [null, "Not assessed"],
  ] as const)("maps %s to %s", (score, label) => {
    expect(skillReadiness(score)).toBe(label);
  });
});

describe("buildProgressDashboard", () => {
  it("counts unique sessions and summarizes trends and feedback per skill", () => {
    const history = [
      attempt("drill-1", "quantitative", 100, 1, ["correct_calculation"]),
      attempt("drill-2", "quantitative", 80, 2, ["correct_calculation"]),
      attempt("case-1", "quantitative", 90, 3, ["strong_synthesis"]),
      attempt("case-1", "structure", 60, 3, ["strong_synthesis"]),
      attempt("case-1", "synthesis", 40, 3, ["strong_synthesis"]),
    ];

    const dashboard = buildProgressDashboard(history);

    expect(dashboard.sessionsCompleted).toBe(3);
    expect(dashboard.skills).toHaveLength(5);
    expect(
      dashboard.skills.find((skill) => skill.skillId === "quantitative"),
    ).toMatchObject({
      readiness: "Strong",
      attemptsCompleted: 3,
      trend: [100, 80, 90],
      commonFeedbackCodes: ["correct_calculation", "strong_synthesis"],
    });
  });

  it("keeps drill and case sessions distinct when their IDs collide", () => {
    const history = [
      attempt("shared-id", "quantitative", 80, 1),
      {
        ...attempt("shared-id", "structure", 70, 2),
        attemptType: "case" as const,
      },
    ];

    expect(buildProgressDashboard(history).sessionsCompleted).toBe(2);
  });
});

describe("buildRecommendedSession", () => {
  it("offers a diagnostic mix before enough history exists", () => {
    expect(buildRecommendedSession([])).toEqual({
      title: "Diagnostic mix",
      skillId: "quantitative",
      drillHref: "/drills/quantitative",
      caseTitle: "AlpineFit",
      caseHref: "/cases/alpinefit-profitability",
    });
  });

  it("links the weakest skill and a relevant case when history is sufficient", () => {
    const history = [
      ...[40, 45, 50].map((score, index) =>
        attempt(`structure-${index}`, "structure", score, index + 1),
      ),
      ...[80, 85, 90].map((score, index) =>
        attempt(`priority-${index}`, "prioritization", score, index + 4),
      ),
      ...[70, 75, 80].map((score, index) =>
        attempt(`quant-${index}`, "quantitative", score, index + 7),
      ),
    ];

    expect(buildRecommendedSession(history)).toMatchObject({
      title: "Structuring",
      skillId: "structure",
      drillHref: "/drills/structure",
      caseHref: "/cases/alpinefit-profitability",
    });
  });

  it("ignores full-case-only dimensions when choosing a drill", () => {
    const history = [
      ...[10, 10, 10].map((score, index) =>
        attempt(`clarification-${index}`, "clarification", score, index + 1),
      ),
      ...[40, 45, 50].map((score, index) =>
        attempt(`structure-${index}`, "structure", score, index + 4),
      ),
      ...[80, 85, 90].map((score, index) =>
        attempt(`priority-${index}`, "prioritization", score, index + 7),
      ),
      ...[70, 75, 80].map((score, index) =>
        attempt(`quant-${index}`, "quantitative", score, index + 10),
      ),
    ];

    expect(buildRecommendedSession(history)).toMatchObject({
      skillId: "structure",
      drillHref: "/drills/structure",
    });
  });
});
