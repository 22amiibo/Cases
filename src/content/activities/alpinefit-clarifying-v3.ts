import { clarificationV2Definition } from "@/content/drills";
import { ActivityDefinitionSchema } from "@/core/activity";

const outcomes = {
  "metric-definition": { classification: "strong", code: "strong_opening" },
  "time-period": { classification: "reasonable", code: "material_term_unresolved" },
  "decision-constraints": { classification: "strong", code: "strong_opening" },
  "logo-color": { classification: "weak", code: "low_value_question" },
  "every-club-manager": { classification: "premature", code: "question_overload" },
} as const;

export const alpinefitClarifyingV3 = ActivityDefinitionSchema.parse({
  id: "alpinefit-clarifying-v3",
  contentVersion: 1,
  eventSchemaVersion: 3,
  scoringVersion: "v3",
  status: "active",
  title: "Choose the first AlpineFit question",
  labId: "clarifying",
  primarySkillId: "clarification",
  secondarySkillIds: [],
  difficulty: "beginner",
  estimatedMinutes: 4,
  caseTypeIds: ["profitability"],
  industryIds: ["fitness"],
  interaction: {
    type: "single_select",
    interactionId: "alpinefit-clarifying",
    prompt: clarificationV2Definition.casePrompt,
    options: clarificationV2Definition.questionOptions.map(({ id, label }) => ({
      id,
      label,
      outcomeId: id,
    })),
    outcomeIds: clarificationV2Definition.questionOptions.map(({ id }) => id),
  },
  feedback: {
    paths: clarificationV2Definition.questionOptions.map((question) => ({
      id: question.id,
      classification: outcomes[question.id as keyof typeof outcomes].classification,
      diagnosticCodes: [outcomes[question.id as keyof typeof outcomes].code],
      explanation: question.response,
      principle: question.highValue
        ? "Ask questions whose answers can change the structure or first test."
        : "Defer questions that do not change the immediate analysis.",
      nextAction: question.highValue
        ? "Use the answer to sharpen the first analysis."
        : "Choose a question tied to the decision, metric, timing, or constraint.",
    })),
  },
  takeaway: "A strong opening question changes what you analyze next.",
});
