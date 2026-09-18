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

export function getActivityDefinition(id: string, contentVersion?: number) {
  return contentVersion === undefined
    ? activityRegistry.getActive(id)
    : activityRegistry.get(id, contentVersion);
}
