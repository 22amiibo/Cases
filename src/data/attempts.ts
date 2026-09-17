import type { DrillResult } from "@/core/drill-engine";
import type { LearnerCaseReview } from "@/core/learner-case";
import {
  SkillIdSchema,
  type CaseEvent,
  type DrillDefinition,
  type DiagnosticOutcome,
  type LearningEvidenceRecord,
  type SkillId,
  type V2SkillId,
} from "@/core/schema";
import type { LearningCycleState } from "@/core/learning-cycle";
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

export function createV2ClarificationAttempt({
  attemptId,
  userId,
  definition,
  cycle,
  systemDiagnostics,
  completedAt,
}: {
  attemptId: string;
  userId: string;
  definition: {
    id: string;
    contentVersion: 2;
    eventSchemaVersion: 2;
    scoringVersion: "v2";
    scaffoldingLevel: "beginner" | "intermediate" | "interview";
    skillId: "clarification";
    conceptIdsPracticed: string[];
    responsePrompt: { interactionId: string };
  };
  cycle: LearningCycleState;
  systemDiagnostics: DiagnosticOutcome[];
  completedAt: string;
}): DrillAttempt {
  return createV2DrillAttempt({
    attemptId,
    userId,
    definition,
    cycle,
    systemDiagnostics,
    completedAt,
  });
}

export function createV2DrillAttempt({
  attemptId,
  userId,
  definition,
  cycle,
  systemDiagnostics,
  completedAt,
}: {
  attemptId: string;
  userId: string;
  definition: {
    id: string;
    contentVersion: 2;
    eventSchemaVersion: 2;
    scoringVersion: "v2";
    scaffoldingLevel: "beginner" | "intermediate" | "interview";
    skillId: V2SkillId;
    conceptIdsPracticed: string[];
    responsePrompt: { interactionId: string };
  };
  cycle: LearningCycleState;
  systemDiagnostics: DiagnosticOutcome[];
  completedAt: string;
}): DrillAttempt {
  const latestResponse = cycle.responses.at(-1);
  const latestAssessment = cycle.assessments.find(
    ({ responseId }) => responseId === latestResponse?.responseId,
  );
  const diagnostics = [...cycle.diagnostics, ...systemDiagnostics];
  const learningEvidence: LearningEvidenceRecord = {
    interactionId: definition.responsePrompt.interactionId,
    skillId: definition.skillId,
    scoringVersion: "v2",
    contentVersion: definition.contentVersion,
    eventSchemaVersion: definition.eventSchemaVersion,
    scaffoldingLevel: definition.scaffoldingLevel,
    responses: cycle.responses,
    rubricOutcomes: latestAssessment?.outcomes ?? [],
    diagnostics,
  };
  return {
    attemptId,
    userId,
    drillId: definition.id,
    skillId: definition.skillId,
    score: 0,
    feedbackCodes: diagnostics.map(({ code }) => code),
    conceptIdsPracticed: definition.conceptIdsPracticed,
    completedAt,
    scoringVersion: "v2",
    contentVersion: definition.contentVersion,
    eventSchemaVersion: definition.eventSchemaVersion,
    scaffoldingLevel: definition.scaffoldingLevel,
    learningEvidence,
    diagnostics,
  };
}

export function createCaseAttempt({
  attemptId,
  userId,
  caseId,
  review,
  events,
  completedAt,
  contentVersion,
  scaffoldingLevel,
}: {
  attemptId: string;
  userId: string;
  caseId: string;
  review: LearnerCaseReview;
  events: CaseEvent[];
  completedAt: string;
  contentVersion?: number;
  scaffoldingLevel?: "beginner" | "intermediate" | "interview" | null;
}): CaseAttempt {
  const resolvedContentVersion = contentVersion ?? 1;
  const skillScores: Partial<Record<SkillId, number>> = {};

  for (const dimension of review.scores) {
    const skillId = SkillIdSchema.safeParse(dimension.id);
    if (!skillId.success || !progressSkillIds.has(skillId.data)) continue;
    skillScores[skillId.data] = Math.round(dimension.value * 1000) / 10;
  }

  const diagnostics = events.flatMap((event) =>
    "diagnostics" in event ? event.diagnostics : [],
  );
  const baseAttempt = {
    attemptId,
    userId,
    caseId,
    skillScores,
    feedbackCodes: [
      ...review.feedback.map((item) => item.code),
      ...diagnostics.map(({ code }) => code),
    ],
    events,
    completedAt,
  };
  if (resolvedContentVersion < 2) return baseAttempt;
  if (!scaffoldingLevel) {
    throw new Error("V2 case attempts require a scaffolding level");
  }
  return {
    ...baseAttempt,
    scoringVersion: "v2",
    contentVersion: resolvedContentVersion,
    eventSchemaVersion: 2,
    scaffoldingLevel,
    learningEvidence: null,
    diagnostics,
  };
}
