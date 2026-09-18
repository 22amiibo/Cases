import structureContent from "./structure.json";
import prioritizationContent from "./prioritization.json";
import quantitativeContent from "./quantitative.json";
import exhibitContent from "./exhibit.json";
import synthesisContent from "./synthesis.json";
import clarificationV2Content from "./clarification-v2.json";
import clarificationV2TransferContent from "./clarification-v2-transfer.json";
import v2PilotContent from "./v2-pilot.json";
import v2TransferContent from "./v2-transfer.json";
import {
  DrillDefinitionSchema,
  V2ClarificationDrillDefinitionSchema,
  type DrillDefinition,
  V2PracticeDrillDefinitionSchema,
  type V2DrillDefinition,
} from "@/core/schema";
import { createVersionedRegistry } from "@/content/versioned-registry";
import { validateV2DrillSet } from "./v2-validation";

export { validateV2DrillSet } from "./v2-validation";

export const drillSkillIds = [
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
  "clarification",
] as const;

export type DrillSkillId = (typeof drillSkillIds)[number];

function parseBank(content: unknown): DrillDefinition[] {
  return DrillDefinitionSchema.array().parse(content);
}

export type LegacyDrillSkillId = Exclude<DrillSkillId, "clarification">;

export const drillBanks: Record<LegacyDrillSkillId, DrillDefinition[]> = {
  structure: parseBank(structureContent),
  prioritization: parseBank(prioritizationContent),
  quantitative: parseBank(quantitativeContent),
  exhibit: parseBank(exhibitContent),
  synthesis: parseBank(synthesisContent),
};

export const clarificationV2Definitions =
  V2ClarificationDrillDefinitionSchema.array().parse([
    clarificationV2Content,
    ...clarificationV2TransferContent,
  ]);
export const clarificationV2Definition = clarificationV2Definitions[0];
export const v2PracticeDefinitions =
  V2PracticeDrillDefinitionSchema.array().parse([
    ...v2PilotContent,
    ...v2TransferContent,
  ]);
export const v2DrillDefinitions: V2DrillDefinition[] = validateV2DrillSet([
  ...clarificationV2Definitions,
  ...v2PracticeDefinitions,
]);

const v1Drills = Object.values(drillBanks).flat();
const v2Drills: V2DrillDefinition[] = v2DrillDefinitions;
export const activeDrillVersions = Object.freeze(
  Object.fromEntries([
    ...v1Drills.map(({ id }) => [id, 1] as const),
    ...v2Drills.map(({ id, contentVersion }) => [id, contentVersion] as const),
  ]),
) as Readonly<Record<string, number>>;
const drillRegistry = createVersionedRegistry(
  [...v1Drills, ...v2Drills],
  activeDrillVersions,
  (definition) =>
    "contentVersion" in definition ? definition.contentVersion : 1,
);

export function getDrillDefinition(id: string, contentVersion?: number) {
  return contentVersion === undefined
    ? drillRegistry.getActive(id)
    : drillRegistry.get(id, contentVersion);
}

export function isDrillSkillId(value: string): value is DrillSkillId {
  return drillSkillIds.includes(value as DrillSkillId);
}

export function isLegacyDrillSkillId(
  value: DrillSkillId,
): value is LegacyDrillSkillId {
  return value !== "clarification";
}
