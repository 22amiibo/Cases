import { z } from "zod";
import { createVersionedRegistry } from "@/content/versioned-registry";
import { IdentifierSchema } from "@/core/schema";
import {
  CaseModeSchema,
  IndustryIdSchema,
  V3SkillIdSchema,
} from "@/core/v3-taxonomy";
import { activeCaseVersions, getCaseDefinition } from ".";

export const CaseMetadataSchema = z.object({
  caseId: IdentifierSchema,
  contentVersion: z.number().int().positive(),
  industryId: IndustryIdSchema,
  estimatedMinutes: z.number().int().positive(),
  practicedSkillIds: z.array(V3SkillIdSchema).min(1),
  supportedModes: z.array(CaseModeSchema).min(1),
}).superRefine((metadata, context) => {
  for (const field of ["practicedSkillIds", "supportedModes"] as const) {
    if (new Set(metadata[field]).size !== metadata[field].length) {
      context.addIssue({
        code: "custom",
        message: `${field} must not contain duplicates`,
        path: [field],
      });
    }
  }
});

export type CaseMetadata = z.infer<typeof CaseMetadataSchema>;

const completeLoopSkills = [
  "clarification",
  "structure",
  "prioritization",
  "hypothesis",
  "exhibit",
  "quantitative",
  "synthesis",
  "recommendation",
] as const;

const legacySkills = [
  "clarification",
  "structure",
  "prioritization",
  "exhibit",
  "synthesis",
  "recommendation",
] as const;

const metadataInput = [
  {
    caseId: "alpinefit-profitability",
    contentVersion: 2,
    industryId: "fitness",
    estimatedMinutes: 35,
    practicedSkillIds: completeLoopSkills,
    supportedModes: ["practice", "interview"],
  },
  {
    caseId: "northstar-profitability",
    contentVersion: 1,
    industryId: "manufacturing",
    estimatedMinutes: 25,
    practicedSkillIds: legacySkills,
    supportedModes: ["practice"],
  },
  {
    caseId: "fleetfix-market-entry",
    contentVersion: 1,
    industryId: "automotive_services",
    estimatedMinutes: 25,
    practicedSkillIds: [...legacySkills, "quantitative"],
    supportedModes: ["practice"],
  },
  {
    caseId: "paypilot-growth",
    contentVersion: 2,
    industryId: "saas",
    estimatedMinutes: 35,
    practicedSkillIds: completeLoopSkills,
    supportedModes: ["practice"],
  },
  {
    caseId: "goldenloaf-operations",
    contentVersion: 2,
    industryId: "restaurants",
    estimatedMinutes: 35,
    practicedSkillIds: completeLoopSkills.filter((skill) => skill !== "quantitative"),
    supportedModes: ["practice"],
  },
  {
    caseId: "morningjet-pricing-breakeven",
    contentVersion: 1,
    industryId: "airlines",
    estimatedMinutes: 25,
    practicedSkillIds: [...legacySkills, "quantitative"],
    supportedModes: ["practice"],
  },
] as const;

export const caseMetadataDefinitions = metadataInput.map((metadata) => {
  const parsed = CaseMetadataSchema.parse(metadata);
  if (!getCaseDefinition(parsed.caseId, parsed.contentVersion)) {
    throw new Error(
      `Case metadata references missing content: ${parsed.caseId}:${parsed.contentVersion}`,
    );
  }
  return parsed;
});

const metadataRegistry = createVersionedRegistry(
  caseMetadataDefinitions.map((metadata) => ({
    ...metadata,
    id: metadata.caseId,
  })),
  activeCaseVersions,
  ({ contentVersion }) => contentVersion,
);

export function getCaseMetadata(caseId: string, contentVersion: number) {
  const entry = metadataRegistry.get(caseId, contentVersion);
  return entry ? CaseMetadataSchema.parse(entry) : undefined;
}
