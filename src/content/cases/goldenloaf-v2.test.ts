import { describe, expect, it } from "vitest";
import { getCaseDefinition, getCaseVersions } from ".";
import { toLearnerCaseDefinition } from "@/core/learner-case";

describe("GoldenLoaf V2", () => {
  it("publishes V2 as active while keeping immutable V1 addressable", () => {
    expect(getCaseVersions("goldenloaf-operations")).toEqual([1, 2]);
    expect(getCaseDefinition("goldenloaf-operations")?.version).toBe(2);
    expect(getCaseDefinition("goldenloaf-operations", 1)?.version).toBe(1);
  });

  it("uses interview scaffolding with no answer-bearing guidance", () => {
    const definition = getCaseDefinition("goldenloaf-operations", 2)!;
    const cycles = [
      definition.opening?.responseCycle,
      definition.hypothesisPractice?.initial,
      definition.hypothesisPractice?.update,
      ...definition.exhibits.map(({ interpretation }) => interpretation),
      definition.synthesis?.responseCycle,
      definition.recommendation.responseCycle,
    ];

    expect(definition.completeLearningLoop).toBe(true);
    expect(cycles.every((cycle) => cycle?.scaffoldingLevel === "interview"))
      .toBe(true);
    expect(cycles.every((cycle) => cycle?.guidance.length === 0)).toBe(true);
  });

  it("keeps process answers and checkpoint choices out of the opening projection", () => {
    const definition = getCaseDefinition("goldenloaf-operations", 2)!;
    const projection = toLearnerCaseDefinition(definition);
    const serialized = JSON.stringify(projection);

    expect(projection.clarificationOptions).toEqual([]);
    expect(serialized).not.toContain("baking is the binding constraint");
    expect(serialized).not.toContain("sequence-and-flex");
    expect(serialized).not.toContain("changeover-loss");
  });

  it("preserves two process hypotheses plus mix, quality, and peak-demand reasoning", () => {
    const definition = getCaseDefinition("goldenloaf-operations", 2)!;

    expect(definition.hypothesisPractice?.options.map(({ id }) => id)).toEqual([
      "demand-mix-pressure",
      "baking-changeover-constraint",
    ]);
    expect(definition.facts.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "premium-mix-growth",
      "sequencing-pilot",
      "peak-gap",
      "flex-hours",
    ]));
    expect(definition.efficientPaths).toHaveLength(2);
  });
});
