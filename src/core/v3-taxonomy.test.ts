import { describe, expect, it } from "vitest";
import { diagnosticCodes } from "./diagnostics";
import {
  IdentifierSchema,
  SkillIdSchema,
  V2SkillIdSchema,
} from "./schema";
import {
  CaseModeSchema,
  CaseTypeIdSchema,
  DifficultySchema,
  IndustryIdSchema,
  SKILL_LAB_IDS,
  SKILL_LAB_LABELS,
  SkillLabIdSchema,
  V3_SKILL_IDS,
  V3_SKILL_LABELS,
  V3SkillIdSchema,
  v2DiagnosticSkillMap,
} from "./v3-taxonomy";

describe("V3 taxonomy", () => {
  it("accepts only the approved stable IDs", () => {
    expect(V3_SKILL_IDS).toEqual([
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
    ]);
    expect(SKILL_LAB_IDS).toEqual([
      "clarifying",
      "structuring",
      "brainstorming",
      "hypothesis",
      "exhibit",
      "case_math",
      "market_sizing",
      "synthesis",
      "recommendation",
    ]);

    expect(V3SkillIdSchema.safeParse("hypothesis").success).toBe(true);
    expect(V3SkillIdSchema.safeParse("hypothesis_formation").success).toBe(false);
    expect(SkillLabIdSchema.safeParse("prioritization").success).toBe(false);
    expect(CaseTypeIdSchema.safeParse("m_and_a").success).toBe(true);
    expect(CaseTypeIdSchema.safeParse("market-entry").success).toBe(false);
    expect(IndustryIdSchema.safeParse("automotive_services").success).toBe(true);
    expect(DifficultySchema.safeParse("expert").success).toBe(false);
    expect(CaseModeSchema.safeParse("interview").success).toBe(true);
    expect(CaseModeSchema.safeParse("interview_scaffolding").success).toBe(false);
  });

  it("gives every V3 skill and public lab one unique learner label", () => {
    expect(Object.keys(V3_SKILL_LABELS)).toEqual(V3_SKILL_IDS);
    expect(new Set(Object.values(V3_SKILL_LABELS)).size).toBe(V3_SKILL_IDS.length);
    expect(Object.keys(SKILL_LAB_LABELS)).toEqual(SKILL_LAB_IDS);
    expect(new Set(Object.values(SKILL_LAB_LABELS)).size).toBe(SKILL_LAB_IDS.length);
  });

  it("maps every released V2 diagnostic to one V3 skill", () => {
    expect(Object.keys(v2DiagnosticSkillMap)).toEqual(diagnosticCodes);
    expect(v2DiagnosticSkillMap.objective_not_reframed).toBe("clarification");
    expect(v2DiagnosticSkillMap.hypothesis_not_linked).toBe("hypothesis");
    expect(v2DiagnosticSkillMap.failed_to_update).toBe("hypothesis");
    expect(v2DiagnosticSkillMap.strong_hypothesis_update).toBe("hypothesis");
    expect(v2DiagnosticSkillMap.unit_error).toBe("quantitative");
    expect(v2DiagnosticSkillMap.strong_recommendation).toBe("recommendation");
  });

  it("does not widen released legacy skill schemas", () => {
    expect(V2SkillIdSchema.safeParse("brainstorming").success).toBe(false);
    expect(V2SkillIdSchema.safeParse("hypothesis").success).toBe(false);
    expect(SkillIdSchema.safeParse("brainstorming").success).toBe(false);
    expect(SkillIdSchema.safeParse("hypothesis").success).toBe(false);
  });

  it("reuses the existing stable identifier contract", () => {
    expect(IdentifierSchema.safeParse("market_sizing-v3").success).toBe(true);
    expect(IdentifierSchema.safeParse("Market sizing").success).toBe(false);
  });
});
