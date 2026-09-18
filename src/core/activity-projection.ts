import { projectLearningCyclePrompt } from "./learning-cycle";
import {
  createActivityState,
  type ActivityDefinition,
  type ActivityState,
} from "./activity";

export function projectLearnerActivity(
  definition: ActivityDefinition | undefined,
  state?: ActivityState,
) {
  if (!definition) throw new Error("Activity version not found");
  const current = state ?? createActivityState(definition);
  const { interaction } = definition;

  let learnerInteraction: Record<string, unknown>;
  switch (interaction.type) {
    case "single_select":
    case "multi_select":
      learnerInteraction = {
        type: interaction.type,
        interactionId: interaction.interactionId,
        prompt: interaction.prompt,
        options: interaction.options.map(({ id, label }) => ({ id, label })),
      };
      break;
    case "ranking":
      learnerInteraction = {
        type: interaction.type,
        interactionId: interaction.interactionId,
        prompt: interaction.prompt,
        items: interaction.items,
      };
      break;
    case "categorization":
      learnerInteraction = {
        type: interaction.type,
        interactionId: interaction.interactionId,
        prompt: interaction.prompt,
        categories: interaction.categories,
        items: interaction.items.map(({ id, label }) => ({ id, label })),
      };
      break;
    case "generated_response":
      learnerInteraction = {
        type: interaction.type,
        ...projectLearningCyclePrompt(interaction.responseCycle),
      };
      break;
    case "brainstorm_builder":
      learnerInteraction = {
        type: interaction.type,
        interactionId: interaction.interactionId,
        prompt: interaction.prompt,
        categories: interaction.categories,
        ideas: interaction.ideas.map(({ id, label }) => ({ id, label })),
        maximumPriorityIdeas: interaction.maximumPriorityIdeas,
      };
      break;
    case "hypothesis_sequence": {
      const commits = current.events.filter(({ type }) => type === "hypothesis_committed");
      const latest = [...commits].reverse().find((event) =>
        event.type === "hypothesis_committed" && event.hypothesisId !== null,
      );
      const evidence = commits.length > 0
        ? interaction.evidenceSteps[commits.length - 1]
        : undefined;
      learnerInteraction = {
        type: interaction.type,
        interactionId: interaction.interactionId,
        prompt: interaction.prompt,
        hypotheses: interaction.hypotheses,
        phase: commits.length === 0 ? "initial" : "update",
        stepId: evidence?.id ?? "initial",
        currentHypothesisId:
          latest?.type === "hypothesis_committed" ? latest.hypothesisId : null,
        ...(evidence
          ? { evidence: { id: evidence.id, evidenceId: evidence.evidenceId, text: evidence.text } }
          : {}),
      };
      break;
    }
    case "exhibit_chain": {
      const commits = current.events.filter(({ type }) => type === "exhibit_committed");
      const stages = ["observe", "prioritize", "interpret", "act"] as const;
      const stage = stages[commits.length] ?? "act";
      const authoredOptions = stage === "observe"
        ? interaction.observationOptions
        : stage === "prioritize"
          ? interaction.priorityOptions
          : stage === "interpret"
            ? interaction.interpretationOptions
            : interaction.actionOptions;
      learnerInteraction = {
        type: interaction.type,
        interactionId: interaction.interactionId,
        prompt: interaction.prompt,
        caseId: interaction.caseId,
        caseContentVersion: interaction.caseContentVersion,
        exhibitId: interaction.exhibitId,
        stage,
        options: authoredOptions.map(({ id, label }) => ({ id, label })),
      };
      break;
    }
  }

  const canRevealFeedback =
    current.outcomeId !== null &&
    current.phase !== "context" &&
    current.phase !== "interaction" &&
    current.reviewStep !== "self_check" &&
    current.reviewStep !== "comparison";
  const visibleFeedback = canRevealFeedback
    ? definition.feedback.paths.find(({ id }) => id === current.outcomeId)
    : undefined;

  return {
    id: definition.id,
    contentVersion: definition.contentVersion,
    eventSchemaVersion: definition.eventSchemaVersion,
    scoringVersion: definition.scoringVersion,
    title: definition.title,
    labId: definition.labId,
    primarySkillId: definition.primarySkillId,
    secondarySkillIds: definition.secondarySkillIds,
    difficulty: definition.difficulty,
    estimatedMinutes: definition.estimatedMinutes,
    caseTypeIds: definition.caseTypeIds,
    industryIds: definition.industryIds,
    interaction: learnerInteraction,
    phase: current.phase,
    reviewStep: current.reviewStep,
    ...(visibleFeedback ? { feedback: visibleFeedback } : {}),
    ...(current.phase === "takeaway" || current.phase === "complete"
      ? { takeaway: definition.takeaway }
      : {}),
  };
}
