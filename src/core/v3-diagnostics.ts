import type { SkillLabId, V3SkillId } from "./v3-taxonomy";

export type V3DiagnosticDefinition = {
  code: string;
  skillId: V3SkillId;
  explanation: string;
  whyItMatters: string;
  severity: "strength" | "coaching" | "blocking";
  allowedSources: Array<"system" | "self_assessment">;
  recommendation: { type: "lab"; labId: SkillLabId };
  supersedingStrengthCode: string | null;
};

const definitionsBySkill = {
  clarification: {
    labId: "clarifying",
    strength: "strong_opening",
    whyItMatters: "A precise opening keeps the analysis tied to the decision.",
    codes: {
      objective_not_reframed: "The opening did not restate the decision objective.",
      material_term_unresolved: "A material term in the objective remained ambiguous.",
      constraint_missed: "The opening omitted a constraint that shapes the analysis.",
      low_value_question: "The question was unlikely to change the analysis path.",
      question_overload: "The opening asked for more information than the decision required.",
      strong_opening: "The opening framed the decision and resolved useful ambiguity.",
    },
  },
  exhibit: {
    labId: "exhibit",
    strength: "strong_exhibit_chain",
    whyItMatters: "Exhibits matter only when observations lead to a decision-relevant action.",
    codes: {
      observation_error: "The selected observation did not match the exhibit.",
      comparison_missed: "The response missed the comparison that distinguishes the result.",
      implication_missing: "The response did not state what the observation means for the case.",
      next_test_missing: "The response did not turn the implication into a useful next action.",
      strong_exhibit_chain: "The response connected observation, implication, and next action.",
    },
  },
  brainstorming: {
    labId: "brainstorming",
    strength: "strong_brainstorm",
    whyItMatters: "Structured breadth finds distinct options without rewarding a long unprioritized list.",
    codes: {
      brainstorm_breadth_narrow: "The ideas covered too few relevant driver categories.",
      brainstorm_categories_overlap: "The chosen categories overlap enough to obscure distinct drivers.",
      brainstorm_idea_redundant: "Multiple ideas describe the same underlying action or driver.",
      brainstorm_off_objective: "An idea does not address the stated decision objective.",
      brainstorm_priority_missing: "The response did not identify which ideas deserve attention first.",
      strong_brainstorm: "The response is broad, distinct, relevant, and prioritized.",
    },
  },
  hypothesis: {
    labId: "hypothesis",
    strength: "strong_hypothesis_update",
    whyItMatters: "A hypothesis should focus the next test and change when contrary evidence appears.",
    codes: {
      hypothesis_missing: "The response did not make a testable causal claim.",
      hypothesis_not_linked: "The hypothesis was not linked to evidence that could test it.",
      evidence_link_missing: "The update did not cite the evidence that changed or supported the claim.",
      update_missing: "The response did not retain, revise, or reject the hypothesis after new evidence.",
      failed_to_update: "The rationale did not explain how the evidence changed the hypothesis.",
      contradicted_hypothesis_retained: "The response retained a hypothesis contradicted by revealed evidence.",
      strong_hypothesis_update: "The response updated a testable claim using specific evidence.",
    },
  },
} as const satisfies Record<
  "clarification" | "exhibit" | "brainstorming" | "hypothesis",
  {
    labId: SkillLabId;
    strength: string;
    whyItMatters: string;
    codes: Record<string, string>;
  }
>;

export const v3DiagnosticDefinitions = Object.entries(definitionsBySkill)
  .flatMap(([skillId, group]) => Object.entries(group.codes).map(
    ([code, explanation]): V3DiagnosticDefinition => ({
      code,
      skillId: skillId as V3SkillId,
      explanation,
      whyItMatters: group.whyItMatters,
      severity: code === group.strength ? "strength" : "coaching",
      allowedSources: ["system", "self_assessment"],
      recommendation: { type: "lab", labId: group.labId },
      supersedingStrengthCode: code === group.strength ? null : group.strength,
    }),
  ));

const definitionsByCode = new Map(
  v3DiagnosticDefinitions.map((definition) => [definition.code, definition]),
);

export function getV3DiagnosticDefinition(code: string) {
  return definitionsByCode.get(code);
}
