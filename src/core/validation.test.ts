import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "./schema";
import { assertValidCase, validateCase, withinTolerance } from "./validation";

function validCase(): CaseDefinition {
  return {
    id: "validation-case",
    version: 1,
    title: "Validation case",
    category: "profitability",
    difficulty: "beginner",
    prompt: "Profit declined.",
    objective: "Find the cause.",
    clarificationOptions: [
      {
        id: "metric",
        label: "Which metric?",
        response: "EBITDA.",
        highValue: true,
      },
    ],
    facts: [
      { id: "cost-fact", text: "Costs rose." },
      { id: "answer-fact", text: "The impact is $20m." },
    ],
    investigationNodes: [
      {
        id: "costs",
        conceptId: "variable_cost",
        label: "Costs",
        interviewerResponse: "Costs rose.",
        factIds: ["cost-fact"],
        exhibitIds: ["cost-exhibit"],
        prerequisiteNodeIds: [],
        critical: true,
        rootCause: true,
        value: "high",
      },
    ],
    exhibits: [
      {
        id: "cost-exhibit",
        title: "Cost change",
        type: "table",
        unit: "$m",
        sourceFactIds: ["cost-fact"],
        columns: ["Cost", "Change"],
        rows: [["Labor", 20]],
        series: [],
        categories: [],
        insights: [{ id: "labor-up", label: "Labor rose.", strength: 1 }],
      },
    ],
    calculations: [
      {
        id: "impact",
        prompt: "What is the impact?",
        unit: "$m",
        formula: { operation: "multiply", inputs: [4, 5] },
        expectedAnswer: 20,
        tolerance: 0.1,
        prerequisiteNodeIds: ["costs"],
        evidenceFactId: "answer-fact",
      },
    ],
    frameworkRubric: {
      concepts: [{ conceptId: "variable_cost", weight: 1, required: true }],
      overlapGroups: [],
      priorityConceptIds: ["variable_cost"],
    },
    recommendation: {
      minimumEvidence: 1,
      decisions: [
        {
          id: "act",
          label: "Act on cost.",
          supportingEvidenceIds: ["cost-fact"],
          weight: 1,
        },
      ],
      risks: [{ id: "risk", label: "Execution risk." }],
      nextSteps: [{ id: "pilot", label: "Run a pilot." }],
    },
    efficientPaths: [{ id: "direct", label: "Direct", nodeIds: ["costs"] }],
  };
}

describe("withinTolerance", () => {
  it("accepts values on the tolerance boundary", () => {
    expect(withinTolerance(10.5, 10, 0.5)).toBe(true);
    expect(withinTolerance(10.51, 10, 0.5)).toBe(false);
  });
});

describe("validateCase", () => {
  it("reports unknown node references", () => {
    const definition = validCase();
    definition.investigationNodes[0].prerequisiteNodeIds = ["missing-node"];

    expect(validateCase(definition)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_node_reference" }),
      ]),
    );
  });

  it("reports missing exhibit source facts", () => {
    const definition = validCase();
    definition.exhibits[0].sourceFactIds = ["missing-fact"];

    expect(validateCase(definition)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_exhibit_fact" }),
      ]),
    );
  });

  it("reports a calculation answer that disagrees with its inputs", () => {
    const definition = validCase();
    definition.calculations[0].expectedAnswer = 19;

    expect(validateCase(definition)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "calculation_answer_mismatch" }),
      ]),
    );
  });

  it("reports a critical node that cannot be reached", () => {
    const definition = validCase();
    definition.investigationNodes.push({
      id: "cycle-a",
      conceptId: "labor",
      label: "Cycle A",
      interviewerResponse: "A",
      factIds: ["cost-fact"],
      exhibitIds: [],
      prerequisiteNodeIds: ["cycle-b"],
      critical: true,
      rootCause: false,
      value: "high",
    });
    definition.investigationNodes.push({
      id: "cycle-b",
      conceptId: "labor",
      label: "Cycle B",
      interviewerResponse: "B",
      factIds: ["cost-fact"],
      exhibitIds: [],
      prerequisiteNodeIds: ["cycle-a"],
      critical: false,
      rootCause: false,
      value: "medium",
    });

    expect(validateCase(definition)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unreachable_critical_node" }),
      ]),
    );
  });

  it("reports recommendation evidence IDs that are not facts", () => {
    const definition = validCase();
    definition.recommendation.decisions[0].supportingEvidenceIds = ["unknown"];

    expect(validateCase(definition)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_recommendation_evidence" }),
      ]),
    );
  });

  it("throws one error containing every issue message", () => {
    const definition = validCase();
    definition.exhibits[0].sourceFactIds = ["missing-fact"];
    definition.recommendation.decisions[0].supportingEvidenceIds = ["unknown"];

    expect(() => assertValidCase(definition)).toThrow(/missing-fact[\s\S]*unknown/);
  });
});
