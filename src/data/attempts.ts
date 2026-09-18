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
  "clarification",
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
]);

function caseEventSkillId(event: CaseEvent): V2SkillId | null {
  if (event.type === "case_opening_submitted") return "clarification";
  if (event.type === "exhibit_interpretation_submitted") return "exhibit";
  if (event.type === "calculation_submitted" && "responses" in event) {
    return "quantitative";
  }
  if (
    (event.type === "synthesis_submitted" || event.type === "recommendation_submitted") &&
    "responses" in event
  ) return "synthesis";
  return null;
}

export function getCaseSkillLearningEvidence(
  events: CaseEvent[],
  skillId: SkillId,
  metadata: {
    contentVersion: number | null;
    eventSchemaVersion: number | null;
    scaffoldingLevel: "beginner" | "intermediate" | "interview" | null;
  },
) {
  if (
    metadata.contentVersion === null ||
    metadata.eventSchemaVersion === null ||
    metadata.scaffoldingLevel === null
  ) return { learningEvidence: null, diagnostics: [] };

  const records = events.flatMap((event): LearningEvidenceRecord[] => {
    if (
      caseEventSkillId(event) !== skillId ||
      !("responses" in event) ||
      !("rubricOutcomes" in event) ||
      !("diagnostics" in event)
    ) return [];
    return [{
      interactionId: event.responses[0].interactionId,
      skillId: skillId as V2SkillId,
      scoringVersion: "v2",
      contentVersion: metadata.contentVersion!,
      eventSchemaVersion: metadata.eventSchemaVersion!,
      scaffoldingLevel: metadata.scaffoldingLevel!,
      responses: event.responses,
      rubricOutcomes: event.rubricOutcomes,
      diagnostics: event.diagnostics,
    }];
  });
  const learningEvidence = records.reduce<LearningEvidenceRecord | null>(
    (best, record) =>
      !best || record.responses!.length >= best.responses!.length ? record : best,
    null,
  );
  return {
    learningEvidence,
    diagnostics: records.flatMap((record) => record.diagnostics ?? []),
  };
}

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
    if (
      !skillId.success ||
      !progressSkillIds.has(skillId.data) ||
      (skillId.data === "clarification" && resolvedContentVersion < 2)
    ) continue;
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
