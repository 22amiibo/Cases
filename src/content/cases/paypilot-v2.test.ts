import { describe, expect, it } from "vitest";
import { getCaseDefinition, getCaseVersions } from ".";
import { toLearnerCaseDefinition } from "@/core/learner-case";

describe("PayPilot V2", () => {
  it("publishes V2 as active while keeping immutable V1 addressable", () => {
    expect(getCaseVersions("paypilot-growth")).toEqual([1, 2]);
    expect(getCaseDefinition("paypilot-growth")?.version).toBe(2);
    expect(getCaseDefinition("paypilot-growth", 1)?.version).toBe(1);
  });

  it("uses the complete intermediate learning loop without answer-bearing hints", () => {
    const definition = getCaseDefinition("paypilot-growth", 2)!;
    const cycles = [
      definition.opening?.responseCycle,
      definition.hypothesisPractice?.initial,
      definition.hypothesisPractice?.update,
      ...definition.exhibits.map(({ interpretation }) => interpretation),
      ...definition.calculations.map(({ responseCycle }) => responseCycle),
      definition.synthesis?.responseCycle,
      definition.recommendation.responseCycle,
    ];

    expect(definition.completeLearningLoop).toBe(true);
    expect(cycles.every((cycle) => cycle?.scaffoldingLevel === "intermediate"))
      .toBe(true);
    expect(cycles.every((cycle) => cycle?.guidance.length === 0)).toBe(true);
  });

  it("keeps preferred decision criteria and authored comparisons out of the opening projection", () => {
    const definition = getCaseDefinition("paypilot-growth", 2)!;
    const serialized = JSON.stringify(toLearnerCaseDefinition(definition));

    expect(serialized).not.toContain("first-year profit, durable growth, and execution risk");
    expect(serialized).not.toContain("cross-sell produces $1.2 million");
    expect(serialized).not.toContain("decision-criteria");
    expect(toLearnerCaseDefinition(definition).clarificationOptions).toEqual([]);
  });

  it("authors distinct cross-sell and expansion hypotheses with evidence routes", () => {
    const definition = getCaseDefinition("paypilot-growth", 2)!;

    expect(definition.hypothesisPractice?.options.map(({ id }) => id)).toEqual([
      "installed-base-cross-sell",
      "geographic-expansion",
    ]);
    expect(definition.hypothesisPractice?.contradictions).toEqual([
      {
        hypothesisId: "geographic-expansion",
        evidenceFactIds: ["expansion-net-profit", "competitive-intensity"],
      },
    ]);
    expect(definition.efficientPaths.map(({ nodeIds }) => nodeIds[0])).toEqual([
      "current-customers",
      "new-market-size",
    ]);
  });
});
