import structureContent from "./structure.json";
import prioritizationContent from "./prioritization.json";
import quantitativeContent from "./quantitative.json";
import exhibitContent from "./exhibit.json";
import synthesisContent from "./synthesis.json";
import { DrillDefinitionSchema, type DrillDefinition } from "@/core/schema";

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

export function isDrillSkillId(value: string): value is DrillSkillId {
  return drillSkillIds.includes(value as DrillSkillId);
}
