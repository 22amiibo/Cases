import type { SkillId } from "./schema";
import type { SkillAttempt } from "@/data/repository";
import {
  calculateRollingSkillScore,
  recommendNextPractice,
} from "./progress";

export const TRAINABLE_SKILLS = [
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
] as const satisfies readonly SkillId[];

export type TrainableSkillId = (typeof TRAINABLE_SKILLS)[number];
export type Readiness =
  | "Not assessed"
  | "Needs work"
  | "Developing"
  | "Interview ready"
  | "Strong";

export const SKILL_LABELS: Record<TrainableSkillId, string> = {
  structure: "Structuring",
  prioritization: "Prioritization",
  quantitative: "Quantitative reasoning",
  exhibit: "Exhibit interpretation",
  synthesis: "Synthesis",
};

export function skillReadiness(score: number | null): Readiness {
  if (score === null) return "Not assessed";
  if (score < 50) return "Needs work";
  if (score < 70) return "Developing";
  if (score < 85) return "Interview ready";
  return "Strong";
}

function commonFeedback(attempts: SkillAttempt[]) {
  const counts = new Map<string, number>();
  for (const code of attempts.flatMap((attempt) => attempt.feedbackCodes)) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 3)
    .map(([code]) => code);
}

export function buildProgressDashboard(history: SkillAttempt[]) {
  return {
    sessionsCompleted: new Set(
      history.map((attempt) => `${attempt.attemptType}:${attempt.attemptId}`),
    ).size,
    skills: TRAINABLE_SKILLS.map((skillId) => {
      const attempts = history
        .filter((attempt) => attempt.skillId === skillId)
        .sort(
          (left, right) =>
            new Date(left.completedAt).getTime() -
            new Date(right.completedAt).getTime(),
        )
        .slice(-10);
      const score = calculateRollingSkillScore(history, skillId);

      return {
        skillId,
        label: SKILL_LABELS[skillId],
        score,
        readiness: skillReadiness(score),
        attemptsCompleted: attempts.length,
        trend: attempts.map((attempt) => attempt.score),
        commonFeedbackCodes: commonFeedback(attempts),
      };
    }),
  };
}

export function buildRecommendedSession(history: SkillAttempt[]) {
  const drillHistory = history.filter((attempt) =>
    TRAINABLE_SKILLS.includes(attempt.skillId as TrainableSkillId),
  );
  const recommendation = recommendNextPractice(drillHistory);
  const skillId =
    recommendation.kind === "skill" &&
    TRAINABLE_SKILLS.includes(recommendation.skillId as TrainableSkillId)
      ? (recommendation.skillId as TrainableSkillId)
      : "quantitative";

  return {
    title:
      recommendation.kind === "skill"
        ? SKILL_LABELS[skillId]
        : "Diagnostic mix",
    skillId,
    drillHref: `/drills/${skillId}`,
    caseTitle: "AlpineFit",
    caseHref: "/cases/alpinefit-profitability",
  };
}
