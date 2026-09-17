import type { SkillId } from "./schema";
import type { SkillAttempt } from "@/data/repository";

const RECENT_ATTEMPT_LIMIT = 10;
const FULL_WEIGHT_ATTEMPT_COUNT = 5;
const OLDER_ATTEMPT_WEIGHT = 0.6;
const MINIMUM_SKILLS_FOR_RECOMMENDATION = 3;
const MINIMUM_ATTEMPTS_PER_SKILL = 3;

export type PracticeRecommendation =
  | { kind: "diagnostic_mix"; reason: "insufficient_history" }
  | {
      kind: "skill";
      skillId: SkillId;
      score: number;
      reason: "weakest_practiced_skill";
    };

function newestFirst(attempts: SkillAttempt[]) {
  return [...attempts].sort(
    (left, right) =>
      new Date(right.completedAt).getTime() -
      new Date(left.completedAt).getTime(),
  );
}

export function calculateRollingSkillScore(
  attempts: SkillAttempt[],
  skillId: SkillId,
  scoringVersion: "v1" | "v2",
): number | null {
  const recent = newestFirst(
    attempts.filter(
      (attempt) =>
        attempt.skillId === skillId &&
        (attempt.scoringVersion ?? "v1") === scoringVersion,
    ),
  ).slice(0, RECENT_ATTEMPT_LIMIT);

  if (recent.length === 0) return null;

  const totals = recent.reduce(
    (result, attempt, index) => {
      const weight =
        index < FULL_WEIGHT_ATTEMPT_COUNT ? 1 : OLDER_ATTEMPT_WEIGHT;
      return {
        weightedScore: result.weightedScore + attempt.score * weight,
        weight: result.weight + weight,
      };
    },
    { weightedScore: 0, weight: 0 },
  );

  return Math.round((totals.weightedScore / totals.weight) * 10) / 10;
}

export function recommendNextPractice(
  attempts: SkillAttempt[],
  scoringVersion: "v1" | "v2",
): PracticeRecommendation {
  const attemptsBySkill = new Map<SkillId, SkillAttempt[]>();

  for (const attempt of attempts) {
    if ((attempt.scoringVersion ?? "v1") !== scoringVersion) continue;
    const skillAttempts = attemptsBySkill.get(attempt.skillId) ?? [];
    skillAttempts.push(attempt);
    attemptsBySkill.set(attempt.skillId, skillAttempts);
  }

  const practicedSkills = [...attemptsBySkill.entries()].filter(
    ([, skillAttempts]) =>
      skillAttempts.length >= MINIMUM_ATTEMPTS_PER_SKILL,
  );

  if (practicedSkills.length < MINIMUM_SKILLS_FOR_RECOMMENDATION) {
    return { kind: "diagnostic_mix", reason: "insufficient_history" };
  }

  const weakest = practicedSkills
    .map(([skillId]) => ({
      skillId,
      score: calculateRollingSkillScore(attempts, skillId, scoringVersion) ?? 0,
    }))
    .sort(
      (left, right) =>
        left.score - right.score || left.skillId.localeCompare(right.skillId),
    )[0];

  return {
    kind: "skill",
    skillId: weakest.skillId,
    score: weakest.score,
    reason: "weakest_practiced_skill",
  };
}
