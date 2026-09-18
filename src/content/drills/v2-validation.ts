import type { V2DrillDefinition } from "@/core/schema";

const expectedSkills = [
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
  "clarification",
] as const;

function reasoningTemplateSignature(definition: V2DrillDefinition) {
  const checkpointKind = definition.skillId === "clarification"
    ? "clarification_questions"
    : definition.checkpoint.kind;
  const criterionPattern = definition.responseCycle.criteria
    .map(({ id }) => id)
    .join(",");

  return [
    definition.skillId,
    definition.responseCycle.responseKind,
    checkpointKind,
    criterionPattern,
  ].join(":");
}

export function validateV2DrillSet(definitions: V2DrillDefinition[]) {
  const ids = new Set<string>();
  const interactionIds = new Set<string>();
  const templates = new Set<string>();

  for (const definition of definitions) {
    if (ids.has(definition.id)) {
      throw new Error(`Duplicate V2 drill ID: ${definition.id}`);
    }
    ids.add(definition.id);

    const template = reasoningTemplateSignature(definition);
    if (templates.has(template)) {
      throw new Error(`Duplicate reasoning template: ${template}`);
    }
    templates.add(template);

    const interactionId = definition.responseCycle.interactionId;
    if (interactionIds.has(interactionId)) {
      throw new Error(`Duplicate V2 interaction ID: ${interactionId}`);
    }
    interactionIds.add(interactionId);
  }

  for (const skillId of expectedSkills) {
    const count = definitions.filter((definition) => definition.skillId === skillId).length;
    if (count !== 3) {
      throw new Error(`Expected exactly three V2 ${skillId} drills; received ${count}`);
    }
  }

  return definitions;
}
