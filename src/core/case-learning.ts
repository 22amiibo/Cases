import type { CaseSession } from "./case-engine";
import type { AuthoredLearningCycle, LearningCycleState } from "./learning-cycle";
import type { CaseDefinition, CaseEvent, DiagnosticOutcome } from "./schema";
import { withinTolerance } from "./validation";
import type { QuantitativeFeedback } from "./quantitative-feedback";
import { getCaseModePolicy } from "./case-mode";

export type CaseCycleKind = "opening" | "calculation" | "synthesis" | "recommendation";

export function getCaseLearningCycle(
  definition: CaseDefinition,
  kind: CaseCycleKind,
  itemId?: string,
): AuthoredLearningCycle | null {
  if (kind === "opening") return definition.opening?.responseCycle ?? null;
  if (kind === "calculation") {
    return definition.calculations.find(({ id }) => id === itemId)?.responseCycle ?? null;
  }
  if (kind === "synthesis") return definition.synthesis?.responseCycle ?? null;
  return definition.recommendation.responseCycle ?? null;
}

function systemDiagnostic(
  code: DiagnosticOutcome["code"],
  severity: DiagnosticOutcome["severity"],
  responseId: string,
): DiagnosticOutcome {
  return { code, severity, source: "system", responseId };
}

export function buildGeneratedCaseEvent({
  session,
  kind,
  itemId,
  cycle,
  checkpoint,
  atMs,
}: {
  session: CaseSession;
  kind: CaseCycleKind;
  itemId?: string;
  cycle: LearningCycleState;
  checkpoint: Record<string, unknown>;
  atMs: number;
}): CaseEvent {
  const latest = cycle.responses.at(-1);
  const assessment = cycle.assessments.find(
    ({ responseId }) => responseId === latest?.responseId,
  );
  if (!latest || !assessment) throw new Error("Incomplete learning cycle");
  const evidence = {
    eventSchemaVersion: 2 as const,
    responses: cycle.responses,
    rubricOutcomes: assessment.outcomes,
    diagnostics: [...cycle.diagnostics],
    authoredComparisonViewed: getCaseModePolicy(session.runContext.mode).showImmediateFeedback,
    atMs,
  };
  const definition = session.caseDefinition;

  if (kind === "opening") {
    const questionIds = Array.isArray(checkpoint.questionIds)
      ? checkpoint.questionIds.filter((id): id is string => typeof id === "string")
      : [];
    const questions = questionIds.map((questionId) => {
      const option = definition.clarificationOptions.find(({ id }) => id === questionId);
      if (!option) throw new Error("Unknown opening question");
      return { questionId, interviewerResponse: option.response };
    });
    const highValueCount = questionIds.filter((id) =>
      definition.clarificationOptions.some((option) => option.id === id && option.highValue),
    ).length;
    evidence.diagnostics.push(systemDiagnostic(
      highValueCount >= (definition.opening?.minimumHighValueQuestions ?? 1)
        ? "strong_opening"
        : "low_value_question",
      highValueCount >= (definition.opening?.minimumHighValueQuestions ?? 1)
        ? "strength"
        : "coaching",
      latest.responseId,
    ));
    return { type: "case_opening_submitted", ...evidence, questions };
  }

  if (kind === "calculation") {
    const calculation = definition.calculations.find(({ id }) => id === itemId);
    if (!calculation || typeof checkpoint.answer !== "number" || typeof checkpoint.unit !== "string") {
      throw new Error("Invalid calculation checkpoint");
    }
    const correct = withinTolerance(checkpoint.answer, calculation.expectedAnswer, calculation.tolerance);
    const unitCorrect = checkpoint.unit === calculation.unit;
    evidence.diagnostics.push(systemDiagnostic(
      !unitCorrect ? "unit_error" : correct ? "strong_quantitative_reasoning" : "arithmetic_error",
      correct && unitCorrect ? "strength" : "blocking",
      latest.responseId,
    ));
    return {
      type: "calculation_submitted",
      ...evidence,
      taskId: calculation.id,
      answer: checkpoint.answer,
      unit: checkpoint.unit,
    };
  }

  const evidenceIds = Array.isArray(checkpoint.evidenceIds)
    ? checkpoint.evidenceIds.filter((id): id is string => typeof id === "string")
    : [];
  if (kind === "synthesis") {
    if (typeof checkpoint.nextStepNodeId !== "string") throw new Error("Invalid synthesis checkpoint");
    evidence.diagnostics.push(systemDiagnostic(
      evidenceIds.length >= 2 ? "strong_synthesis" : "evidence_unsupported",
      evidenceIds.length >= 2 ? "strength" : "coaching",
      latest.responseId,
    ));
    return {
      type: "synthesis_submitted",
      ...evidence,
      evidenceIds,
      nextStepNodeId: checkpoint.nextStepNodeId,
    };
  }

  if (
    typeof checkpoint.decisionId !== "string" ||
    typeof checkpoint.riskId !== "string" ||
    typeof checkpoint.nextStepId !== "string"
  ) throw new Error("Invalid recommendation checkpoint");
  evidence.diagnostics.push(systemDiagnostic(
    evidenceIds.length >= definition.recommendation.minimumEvidence
      ? "strong_recommendation"
      : "support_insufficient",
    evidenceIds.length >= definition.recommendation.minimumEvidence
      ? "strength"
      : "blocking",
    latest.responseId,
  ));
  return {
    type: "recommendation_submitted",
    ...evidence,
    decisionId: checkpoint.decisionId,
    evidenceIds,
    riskId: checkpoint.riskId,
    nextStepId: checkpoint.nextStepId,
  };
}

export function materializeGeneratedCaseDiagnostics(
  definition: CaseDefinition,
  event: CaseEvent,
): DiagnosticOutcome[] {
  if (!("responses" in event) || !("diagnostics" in event) || event.diagnostics.length > 0) {
    return "diagnostics" in event ? event.diagnostics : [];
  }
  const responseId = event.responses.at(-1)?.responseId;
  if (!responseId) return [];
  if (event.type === "case_opening_submitted") {
    const highValueCount = event.questions.filter(({ questionId }) =>
      definition.clarificationOptions.some((option) => option.id === questionId && option.highValue),
    ).length;
    const strong = highValueCount >= (definition.opening?.minimumHighValueQuestions ?? 1);
    return [systemDiagnostic(strong ? "strong_opening" : "low_value_question", strong ? "strength" : "coaching", responseId)];
  }
  if (event.type === "calculation_submitted") {
    const calculation = definition.calculations.find(({ id }) => id === event.taskId);
    if (!calculation) return [];
    const correct = withinTolerance(event.answer, calculation.expectedAnswer, calculation.tolerance);
    const unitCorrect = event.unit === calculation.unit;
    return [systemDiagnostic(
      !unitCorrect ? "unit_error" : correct ? "strong_quantitative_reasoning" : "arithmetic_error",
      correct && unitCorrect ? "strength" : "blocking",
      responseId,
    )];
  }
  if (event.type === "synthesis_submitted") {
    const strong = event.evidenceIds.length >= 2;
    return [systemDiagnostic(strong ? "strong_synthesis" : "evidence_unsupported", strong ? "strength" : "coaching", responseId)];
  }
  if (event.type === "recommendation_submitted") {
    const strong = event.evidenceIds.length >= definition.recommendation.minimumEvidence;
    return [systemDiagnostic(strong ? "strong_recommendation" : "support_insufficient", strong ? "strength" : "blocking", responseId)];
  }
  return [];
}

export function buildCaseQuantitativeFeedback(
  definition: CaseDefinition,
  itemId: string | undefined,
  checkpoint: Record<string, unknown>,
): QuantitativeFeedback {
  const calculation = definition.calculations.find(({ id }) => id === itemId);
  if (
    !calculation ||
    typeof checkpoint.answer !== "number" ||
    typeof checkpoint.unit !== "string" ||
    !calculation.responseCycle
  ) {
    throw new Error("Invalid calculation checkpoint");
  }
  return {
    submittedAnswer: checkpoint.answer,
    submittedUnit: checkpoint.unit,
    answerCorrect: withinTolerance(
      checkpoint.answer,
      calculation.expectedAnswer,
      calculation.tolerance,
    ),
    unitCorrect: checkpoint.unit === calculation.unit,
    correctAnswer: calculation.expectedAnswer,
    correctUnit: calculation.unit,
    explanation: calculation.responseCycle.comparison.text,
  };
}
