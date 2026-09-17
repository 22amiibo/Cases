import { revealLearningCycleAfterCommit, projectLearningCyclePrompt } from "./learning-cycle";
import { DiagnosticOutcomeSchema, type CommittedResponse, type V2ClarificationDrillDefinition } from "./schema";

export function projectClarificationDrill(
  definition: V2ClarificationDrillDefinition,
) {
  return {
    id: definition.id,
    contentVersion: definition.contentVersion,
    eventSchemaVersion: definition.eventSchemaVersion,
    scoringVersion: definition.scoringVersion,
    scaffoldingLevel: definition.scaffoldingLevel,
    skillId: definition.skillId,
    conceptIdsPracticed: definition.conceptIdsPracticed,
    title: definition.title,
    casePrompt: definition.casePrompt,
    responsePrompt: projectLearningCyclePrompt(definition.responseCycle),
  };
}

export function revealClarificationAfterCommit(
  definition: V2ClarificationDrillDefinition,
  response: CommittedResponse,
) {
  return {
    reveal: revealLearningCycleAfterCommit(definition.responseCycle, response),
    questionOptions: definition.questionOptions.map(({ id, label }) => ({ id, label })),
  };
}

export function evaluateClarificationQuestions(
  definition: V2ClarificationDrillDefinition,
  questionIds: string[],
  responseId: string,
) {
  const uniqueIds = [...new Set(questionIds)];
  if (uniqueIds.length !== questionIds.length || uniqueIds.length === 0) {
    throw new Error("Select one or more distinct clarification questions");
  }
  const selected = uniqueIds.map((id) => {
    const question = definition.questionOptions.find((candidate) => candidate.id === id);
    if (!question) throw new Error("Unknown clarification question");
    return question;
  });
  const highValueCount = selected.filter(({ highValue }) => highValue).length;
  const hasLowValue = selected.some(({ highValue }) => !highValue);
  const overloaded = selected.length > definition.recommendedQuestionCount;
  const diagnostics = [
    ...(hasLowValue
      ? [{ code: "low_value_question", source: "system", severity: "coaching", responseId } as const]
      : []),
    ...(overloaded
      ? [{ code: "question_overload", source: "system", severity: "blocking", responseId } as const]
      : []),
    ...(highValueCount >= definition.minimumHighValueQuestions && !hasLowValue && !overloaded
      ? [{ code: "strong_opening", source: "system", severity: "strength", responseId } as const]
      : []),
  ].map((diagnostic) => DiagnosticOutcomeSchema.parse(diagnostic));

  return {
    responses: selected.map(({ id, response }) => ({ questionId: id, response })),
    diagnostics,
  };
}
