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

  it("adds display-only investigation categories without changing authored graph logic", () => {
    const legacy = getCaseDefinition("alpinefit-profitability", 1)!;
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;

    expect(
      definition.investigationNodes.map(({ id, displayCategory }) => [
        id,
        displayCategory,
      ]),
    ).toEqual([
      ["revenue", "Revenue"],
      ["price", "Revenue"],
      ["volume", "Revenue"],
      ["costs", "Operating Costs"],
      ["fixed_cost", "Operating Costs"],
      ["variable_cost", "Operating Costs"],
      ["labor", "Labor & Staffing"],
      ["materials", "Operating Costs"],
      ["overtime", "Labor & Staffing"],
      ["vacancies", "Labor & Staffing"],
      ["turnover", "Labor & Staffing"],
    ]);
    expect(
      definition.investigationNodes.map(({ displayCategory, ...node }) => {
        void displayCategory;
        return node;
      }),
    ).toEqual(legacy.investigationNodes);
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
