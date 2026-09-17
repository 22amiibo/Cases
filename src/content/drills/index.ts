import structureContent from "./structure.json";
import prioritizationContent from "./prioritization.json";
import quantitativeContent from "./quantitative.json";
import exhibitContent from "./exhibit.json";
import synthesisContent from "./synthesis.json";
import clarificationV2Content from "./clarification-v2.json";
import {
  DrillDefinitionSchema,
  V2ClarificationDrillDefinitionSchema,
  type DrillDefinition,
  type V2ClarificationDrillDefinition,
} from "@/core/schema";
import { createVersionedRegistry } from "@/content/versioned-registry";

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

export const clarificationV2Definition =
  V2ClarificationDrillDefinitionSchema.parse(clarificationV2Content);

const v1Drills = Object.values(drillBanks).flat();
const v2Drills: V2ClarificationDrillDefinition[] = [clarificationV2Definition];
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
