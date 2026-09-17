import structureContent from "./structure.json";
import prioritizationContent from "./prioritization.json";
import quantitativeContent from "./quantitative.json";
import exhibitContent from "./exhibit.json";
import synthesisContent from "./synthesis.json";
import { DrillDefinitionSchema, type DrillDefinition } from "@/core/schema";
import { createVersionedRegistry } from "@/content/versioned-registry";

export const drillSkillIds = [
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
] as const;

export type DrillSkillId = (typeof drillSkillIds)[number];

function parseBank(content: unknown): DrillDefinition[] {
  return DrillDefinitionSchema.array().parse(content);
}

export const drillBanks: Record<DrillSkillId, DrillDefinition[]> = {
  structure: parseBank(structureContent),
  prioritization: parseBank(prioritizationContent),
  quantitative: parseBank(quantitativeContent),
  exhibit: parseBank(exhibitContent),
  synthesis: parseBank(synthesisContent),
};

const v1Drills = Object.values(drillBanks).flat();
export const activeDrillVersions = Object.freeze(
  Object.fromEntries(v1Drills.map(({ id }) => [id, 1])),
) as Readonly<Record<string, number>>;
const drillRegistry = createVersionedRegistry(
  v1Drills,
  activeDrillVersions,
  () => 1,
);

export function getDrillDefinition(id: string, contentVersion?: number) {
  return contentVersion === undefined
    ? drillRegistry.getActive(id)
    : drillRegistry.get(id, contentVersion);
}

export function isDrillSkillId(value: string): value is DrillSkillId {
  return drillSkillIds.includes(value as DrillSkillId);
}
