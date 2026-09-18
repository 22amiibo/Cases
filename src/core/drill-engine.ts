import type { DrillDefinition, FrameworkSubmission } from "./schema";
import { scoreFramework } from "./framework-scoring";
import type { QuantitativeFeedback } from "./quantitative-feedback";
import { withinTolerance } from "./validation";

export type DrillResult = {
  skillId: DrillDefinition["skillId"];
  pointsEarned: number;
  pointsPossible: number;
  feedbackCode: string;
  conceptIdsPracticed: string[];
  quantitativeFeedback?: QuantitativeFeedback;
};

export type PrioritizationSubmission = { optionId: string };
export type QuantitativeSubmission = { answer: number; unit: string };
export type ExhibitSubmission = {
  observationId: string;
  implicationId: string;
  nextInvestigationId: string;
};
export type SynthesisSubmission = {
  evidenceIds: string[];
  nextStepId: string;
};

export type DrillSubmission =
  | FrameworkSubmission
  | PrioritizationSubmission
  | QuantitativeSubmission
  | ExhibitSubmission
  | SynthesisSubmission;

function result(
  definition: DrillDefinition,
  pointsEarned: number,
  feedbackCode: string,
): DrillResult {
  return {
    skillId: definition.skillId,
    pointsEarned,
    pointsPossible: 100,
    feedbackCode,
    conceptIdsPracticed: definition.conceptIdsPracticed,
  };
}

export function evaluateDrill(
  definition: DrillDefinition,
  submission: DrillSubmission,
): DrillResult {
  switch (definition.skillId) {
    case "structure": {
      const frameworkScore = scoreFramework(
        submission as FrameworkSubmission,
        definition.rubric,
      );
      const points = Math.max(
        0,
        Math.round(
          (frameworkScore.coverage * 0.75 +
            frameworkScore.priorityScore * 0.25 -
            frameworkScore.overlapPenalty) *
            100,
        ),
      );
      return result(
        definition,
        points,
        points === 100 ? "complete_structure" : "structure_has_gaps",
      );
    }
    case "prioritization": {
      const { optionId } = submission as PrioritizationSubmission;
      const weight =
        definition.options.find((option) => option.id === optionId)?.weight ?? 0;
      const points = Math.round(weight * 100);
      return result(
        definition,
        points,
        points >= 80 ? "strong_priority" : "low_value_priority",
      );
    }
    case "quantitative": {
      const { answer, unit } = submission as QuantitativeSubmission;
      const answerCorrect = withinTolerance(
        answer,
        definition.expectedAnswer,
        definition.tolerance,
      );
      const unitCorrect = unit === definition.requiredUnit;
      const evaluated = result(
        definition,
        answerCorrect && unitCorrect ? 100 : 0,
        answerCorrect && unitCorrect ? "correct_calculation" : "check_answer_and_unit",
      );
      return {
        ...evaluated,
        quantitativeFeedback: {
          submittedAnswer: answer,
          submittedUnit: unit,
          answerCorrect,
          unitCorrect,
          correctAnswer: definition.expectedAnswer,
          correctUnit: definition.requiredUnit,
          explanation: definition.explanation,
        },
      };
    }
    case "exhibit": {
      const exhibitSubmission = submission as ExhibitSubmission;
      const matches = [
        exhibitSubmission.observationId === definition.correct.observationId,
        exhibitSubmission.implicationId === definition.correct.implicationId,
        exhibitSubmission.nextInvestigationId ===
          definition.correct.nextInvestigationId,
      ].filter(Boolean).length;
      const points = Math.round((matches / 3) * 100);
      return result(
        definition,
        points,
        matches === 3 ? "strong_exhibit_read" : "exhibit_chain_has_gaps",
      );
    }
    case "synthesis": {
      const synthesis = submission as SynthesisSubmission;
      const submittedEvidence = new Set(synthesis.evidenceIds);
      const evidenceMatches = definition.correctEvidenceIds.filter((evidenceId) =>
        submittedEvidence.has(evidenceId),
      ).length;
      const nextStepMatch =
        synthesis.nextStepId === definition.correctNextStepId ? 1 : 0;
      const points = Math.round(((evidenceMatches + nextStepMatch) / 3) * 100);
      return result(
        definition,
        points,
        points === 100 ? "strong_synthesis" : "synthesis_has_gaps",
      );
    }
  }
}
