import { ActivityDefinitionSchema, type ActivityDefinition } from "@/core/activity";
import { getV3DiagnosticDefinition } from "@/core/v3-diagnostics";
import { createVersionedRegistry } from "@/content/versioned-registry";

export function createActivityRegistry(
  definitions: unknown[],
  activeVersions: Readonly<Record<string, number>>,
) {
  const parsed = definitions.map((definition) => ActivityDefinitionSchema.parse(definition));
  for (const activity of parsed) {
    const declaredSkills = new Set([
      activity.primarySkillId,
      ...activity.secondarySkillIds,
    ]);
    for (const code of activity.feedback.paths.flatMap(({ diagnosticCodes }) => diagnosticCodes)) {
      const diagnostic = getV3DiagnosticDefinition(code);
      if (!diagnostic) throw new Error(`Unknown V3 diagnostic code: ${code}`);
      if (!declaredSkills.has(diagnostic.skillId)) {
        throw new Error(`Diagnostic ${code} is not owned by a declared activity skill`);
      }
    }
  }
  const registry = createVersionedRegistry(
    parsed,
    activeVersions,
    ({ contentVersion }) => contentVersion,
  );
  for (const [id, contentVersion] of Object.entries(activeVersions)) {
    if (registry.get(id, contentVersion)?.status !== "active") {
      throw new Error(`Retired or draft activity cannot be active: ${id}:${contentVersion}`);
    }
  }
  return registry;
}

export const activityDefinitions: ActivityDefinition[] = [];
export const activeActivityVersions = Object.freeze({}) as Readonly<Record<string, number>>;
const activityRegistry = createActivityRegistry(activityDefinitions, activeActivityVersions);

const privateTestActivity = ActivityDefinitionSchema.parse({
  id: "v3-private-test",
  contentVersion: 1,
  eventSchemaVersion: 3,
  scoringVersion: "v3",
  status: "active",
  title: "Private V3 activity check",
  labId: "clarifying",
  primarySkillId: "clarification",
  secondarySkillIds: [],
  difficulty: "beginner",
  estimatedMinutes: 2,
  caseTypeIds: ["profitability"],
  industryIds: ["fitness"],
  interaction: {
    type: "single_select",
    interactionId: "private-choice",
    prompt: "Which question is most useful first?",
    options: [
      { id: "objective", label: "Clarify the decision", outcomeId: "strong" },
      { id: "history", label: "Ask for company history", outcomeId: "weak" },
    ],
    outcomeIds: ["strong", "weak"],
  },
  feedback: { paths: [
    {
      id: "strong",
      classification: "strong",
      diagnosticCodes: ["strong_opening"],
      explanation: "This resolves the decision before analysis starts.",
      principle: "Clarify the decision first.",
      nextAction: "Restate the objective.",
    },
    {
      id: "weak",
      classification: "premature",
      diagnosticCodes: ["low_value_question"],
      explanation: "Company history does not resolve the immediate decision.",
      principle: "Clarify the decision first.",
      nextAction: "Ask for the objective and scope.",
    },
  ] },
  takeaway: "Clarify the decision before requesting detail.",
});

export function getActivityDefinition(id: string, contentVersion?: number) {
  if (
    process.env.NODE_ENV !== "production" &&
    id === privateTestActivity.id &&
    (contentVersion === undefined || contentVersion === privateTestActivity.contentVersion)
  ) return privateTestActivity;
  return contentVersion === undefined
    ? activityRegistry.getActive(id)
    : activityRegistry.get(id, contentVersion);
}
