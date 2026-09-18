import { projectLearningCyclePrompt, revealLearningCycleAfterCommit } from "./learning-cycle";
import { scoreFramework } from "./framework-scoring";
import {
  DiagnosticOutcomeSchema,
  FrameworkSubmissionSchema,
  type CommittedResponse,
  type FrameworkSubmission,
  type V2PracticeDrillDefinition,
} from "./schema";
import { withinTolerance } from "./validation";
import type { QuantitativeFeedback } from "./quantitative-feedback";
import { z } from "zod";

export type { QuantitativeFeedback } from "./quantitative-feedback";

export type V2CheckpointSubmission =
  | FrameworkSubmission
  | { optionId: string }
  | { answer: number; unit: string }
  | { evidenceIds: string[]; nextStepId: string };

export type LearnerV2Checkpoint =
  | { kind: "framework"; conceptOptions: Array<{ id: string; label: string }> }
  | { kind: "choice"; label: string; options: Array<{ id: string; label: string }> }
  | { kind: "quantitative"; unitOptions: string[] }
  | {
      kind: "synthesis";
      evidenceOptions: Array<{ id: string; label: string }>;
      nextStepOptions: Array<{ id: string; label: string }>;
    };

export function projectV2PracticeDrill(definition: V2PracticeDrillDefinition) {
  return {
    id: definition.id,
    contentVersion: definition.contentVersion,
    eventSchemaVersion: definition.eventSchemaVersion,
    scoringVersion: definition.scoringVersion,
    scaffoldingLevel: definition.scaffoldingLevel,
    skillId: definition.skillId,
    conceptIdsPracticed: definition.conceptIdsPracticed,
    title: definition.title,
    scenario: definition.scenario,
    responsePrompt: projectLearningCyclePrompt(definition.responseCycle),
  };
}

export function revealV2PracticeAfterCommit(
  definition: V2PracticeDrillDefinition,
  response: CommittedResponse,
) {
  let checkpoint: LearnerV2Checkpoint;
  switch (definition.checkpoint.kind) {
    case "framework":
      checkpoint = {
        kind: definition.checkpoint.kind,
        conceptOptions: definition.checkpoint.conceptOptions.map((option) => ({ ...option })),
      };
      break;
    case "choice":
      checkpoint = {
        kind: definition.checkpoint.kind,
        label: definition.checkpoint.label,
        options: definition.checkpoint.options.map((option) => ({ ...option })),
      };
      break;
    case "quantitative":
      checkpoint = {
        kind: definition.checkpoint.kind,
        unitOptions: [...definition.checkpoint.unitOptions],
      };
      break;
    case "synthesis":
      checkpoint = {
        kind: definition.checkpoint.kind,
        evidenceOptions: definition.checkpoint.evidenceOptions.map((option) => ({ ...option })),
        nextStepOptions: definition.checkpoint.nextStepOptions.map((option) => ({ ...option })),
      };
      break;
  }
  return {
    reveal: revealLearningCycleAfterCommit(definition.responseCycle, response),
    checkpoint,
  };
}

export function evaluateV2Checkpoint(
  definition: V2PracticeDrillDefinition,
  submission: V2CheckpointSubmission,
  responseId: string,
) {
  let code: string;
  let severity: "strength" | "coaching" | "blocking";
  let feedback: QuantitativeFeedback | undefined;
  switch (definition.checkpoint.kind) {
    case "framework": {
      const value = FrameworkSubmissionSchema.parse(submission);
      const score = scoreFramework(value, definition.checkpoint.rubric);
      const strong = score.missedConceptIds.length === 0 && score.priorityScore === 1 && score.overlapPenalty === 0;
      code = strong ? "strong_structure" : "missing_major_branch";
      severity = strong ? "strength" : "blocking";
      break;
    }
    case "choice": {
      const value = z.object({ optionId: z.string().min(1) }).parse(submission);
      if (!definition.checkpoint.options.some(({ id }) => id === value.optionId)) {
        throw new Error("Unknown checkpoint option");
      }
      const strong = value.optionId === definition.checkpoint.correctId;
      code = strong ? definition.checkpoint.successCode : definition.checkpoint.coachingCode;
      severity = strong ? "strength" : "coaching";
      break;
    }
    case "quantitative": {
      const value = z.object({ answer: z.number().finite(), unit: z.string().min(1) }).parse(submission);
      const answerCorrect = withinTolerance(value.answer, definition.checkpoint.expectedAnswer, definition.checkpoint.tolerance);
      const unitCorrect = value.unit === definition.checkpoint.requiredUnit;
      if (value.unit !== definition.checkpoint.requiredUnit) {
        code = "unit_error";
        severity = "blocking";
      } else if (!withinTolerance(value.answer, definition.checkpoint.expectedAnswer, definition.checkpoint.tolerance)) {
        code = "arithmetic_error";
        severity = "blocking";
      } else {
        code = "strong_quantitative_reasoning";
        severity = "strength";
      }
      feedback = {
        submittedAnswer: value.answer,
        submittedUnit: value.unit,
        answerCorrect,
        unitCorrect,
        correctAnswer: definition.checkpoint.expectedAnswer,
        correctUnit: definition.checkpoint.requiredUnit,
        explanation: definition.responseCycle.comparison.text,
      };
      break;
    }
    case "synthesis": {
      const value = z.object({
        evidenceIds: z.array(z.string().min(1)).min(1),
        nextStepId: z.string().min(1),
      }).parse(submission);
      const knownEvidenceIds = new Set(definition.checkpoint.evidenceOptions.map(({ id }) => id));
      const knownNextStepIds = new Set(definition.checkpoint.nextStepOptions.map(({ id }) => id));
      if (
        value.evidenceIds.some((id) => !knownEvidenceIds.has(id)) ||
        !knownNextStepIds.has(value.nextStepId)
      ) {
        throw new Error("Unknown synthesis option");
      }
      const evidence = new Set(value.evidenceIds);
      const strong = definition.checkpoint.correctEvidenceIds.every((id) => evidence.has(id)) &&
        value.nextStepId === definition.checkpoint.correctNextStepId;
      code = strong ? "strong_synthesis" : "evidence_unsupported";
      severity = strong ? "strength" : "blocking";
      break;
    }
  }
  return {
    diagnostics: [DiagnosticOutcomeSchema.parse({ code, source: "system", severity, responseId })],
    ...(feedback ? { feedback } : {}),
  };
}
