import type { DrillResult } from "@/core/drill-engine";
import type { LearnerCaseReview } from "@/core/learner-case";
import {
  SkillIdSchema,
  type CaseEvent,
  type DrillDefinition,
  type SkillId,
} from "@/core/schema";
import type { CaseAttempt, DrillAttempt } from "./repository";

const progressSkillIds = new Set<SkillId>([
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
]);

export function createDrillAttempt(
  attemptId: string,
  userId: string,
  definition: DrillDefinition,
  result: DrillResult,
  completedAt: string,
): DrillAttempt {
  return {
    attemptId,
    userId,
    drillId: definition.id,
    skillId: result.skillId,
    score: result.pointsEarned,
    feedbackCodes: [result.feedbackCode],
    conceptIdsPracticed: result.conceptIdsPracticed,
    completedAt,
  };
}

export function createCaseAttempt({
  attemptId,
  userId,
  caseId,
  review,
  events,
  completedAt,
}: {
  attemptId: string;
  userId: string;
  caseId: string;
  review: LearnerCaseReview;
  events: CaseEvent[];
  completedAt: string;
}): CaseAttempt {
  const skillScores: Partial<Record<SkillId, number>> = {};

  for (const dimension of review.scores) {
    const skillId = SkillIdSchema.safeParse(dimension.id);
    if (!skillId.success || !progressSkillIds.has(skillId.data)) continue;
    skillScores[skillId.data] = Math.round(dimension.value * 1000) / 10;
  }

  return {
    attemptId,
    userId,
    caseId,
    skillScores,
    feedbackCodes: review.feedback.map((item) => item.code),
    events,
    completedAt,
  };
}
