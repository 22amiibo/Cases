import { z } from "zod";
import {
  diagnosticCodes,
  diagnosticDefinitions,
  type DiagnosticCode,
} from "./diagnostics";

export const V3_SKILL_IDS = [
  "clarification",
  "structure",
  "prioritization",
  "brainstorming",
  "hypothesis",
  "exhibit",
  "quantitative",
  "market_sizing",
  "synthesis",
  "recommendation",
] as const;

export const SKILL_LAB_IDS = [
  "clarifying",
  "structuring",
  "brainstorming",
  "hypothesis",
  "exhibit",
  "case_math",
  "market_sizing",
  "synthesis",
  "recommendation",
] as const;

export const V3SkillIdSchema = z.enum(V3_SKILL_IDS);
export const SkillLabIdSchema = z.enum(SKILL_LAB_IDS);
export const CaseTypeIdSchema = z.enum([
  "profitability",
  "growth",
  "market_entry",
  "pricing",
  "m_and_a",
  "operations",
]);
export const IndustryIdSchema = z.enum([
  "fitness",
  "airlines",
  "restaurants",
  "saas",
  "manufacturing",
  "automotive_services",
]);
export const DifficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);
export const CaseModeSchema = z.enum(["practice", "interview"]);

export type V3SkillId = z.infer<typeof V3SkillIdSchema>;
export type SkillLabId = z.infer<typeof SkillLabIdSchema>;
export type CaseTypeId = z.infer<typeof CaseTypeIdSchema>;
export type IndustryId = z.infer<typeof IndustryIdSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type CaseMode = z.infer<typeof CaseModeSchema>;

export const V3_SKILL_LABELS = {
  clarification: "Clarifying",
  structure: "Structuring",
  prioritization: "Prioritization",
  brainstorming: "Brainstorming",
  hypothesis: "Hypothesis",
  exhibit: "Exhibit analysis",
  quantitative: "Case math",
  market_sizing: "Market sizing",
  synthesis: "Synthesis",
  recommendation: "Recommendation",
} as const satisfies Record<V3SkillId, string>;

export const SKILL_LAB_LABELS = {
  clarifying: "Clarifying",
  structuring: "Structuring",
  brainstorming: "Brainstorming",
  hypothesis: "Hypothesis",
  exhibit: "Exhibit analysis",
  case_math: "Case math",
  market_sizing: "Market sizing",
  synthesis: "Synthesis",
  recommendation: "Recommendation",
} as const satisfies Record<SkillLabId, string>;

const skillByDiagnosticArea = {
  clarification: "clarification",
  structure: "structure",
  prioritization: "prioritization",
  quantitative: "quantitative",
  exhibit: "exhibit",
  synthesis: "synthesis",
  recommendation: "recommendation",
  hypothesis: "hypothesis",
} as const satisfies Record<
  (typeof diagnosticDefinitions)[DiagnosticCode]["area"],
  V3SkillId
>;

export const v2DiagnosticSkillMap = Object.fromEntries(
  diagnosticCodes.map((code) => [
    code,
    code === "hypothesis_not_linked" || code === "failed_to_update"
      ? "hypothesis"
      : skillByDiagnosticArea[diagnosticDefinitions[code].area],
  ]),
) as Record<DiagnosticCode, V3SkillId>;
