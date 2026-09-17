import { describe, expect, it } from "vitest";
import { getCaseDefinition, getCaseVersions } from ".";
import { toLearnerCaseDefinition } from "@/core/learner-case";
import { CaseDefinitionSchema } from "@/core/schema";

describe("AlpineFit V2", () => {
  it("publishes V2 as active while keeping immutable V1 addressable", () => {
    expect(getCaseVersions("alpinefit-profitability")).toEqual([1, 2]);
    expect(getCaseDefinition("alpinefit-profitability")?.version).toBe(2);
    expect(getCaseDefinition("alpinefit-profitability", 1)?.version).toBe(1);
  });

  it("contains the complete beginner generated-response loop", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2);
    expect(definition?.opening?.responseCycle.scaffoldingLevel).toBe("beginner");
    expect(definition?.hypothesisPractice?.options).toHaveLength(2);
    expect(definition?.exhibits.every(({ interpretation }) => interpretation)).toBe(true);
    expect(definition?.calculations.every(({ responseCycle }) => responseCycle)).toBe(true);
    expect(definition?.synthesis?.responseCycle.scaffoldingLevel).toBe("beginner");
    expect(definition?.recommendation.responseCycle?.scaffoldingLevel).toBe("beginner");
  });

  it("does not reveal opening choices before the generated response is committed", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2);
    expect(definition).toBeDefined();
    const projection = toLearnerCaseDefinition(definition!);
    expect(projection.clarificationOptions).toEqual([]);
    expect(JSON.stringify(projection)).not.toContain("six-point decline");
  });

  it("rejects a generated diagnostic that references an unknown criterion", () => {
    const definition = structuredClone(getCaseDefinition("alpinefit-profitability", 2)!);
    definition.recommendation.responseCycle!.diagnosticRules[0].criterionId = "missing-criterion";

    expect(CaseDefinitionSchema.safeParse(definition).success).toBe(false);
  });
});
