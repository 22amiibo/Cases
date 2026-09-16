import { describe, expect, it } from "vitest";
import { CaseDefinitionSchema } from "./schema";

function validCase() {
  return {
    id: "sample-case",
    version: 1,
    title: "Sample case",
    category: "profitability",
    difficulty: "beginner",
    prompt: "Revenue is growing, but profit is shrinking.",
    objective: "Find the primary profit driver and recommend a response.",
    clarificationOptions: [
      {
        id: "metric",
        label: "Which profit metric matters?",
        response: "Focus on EBITDA margin.",
        highValue: true,
      },
    ],
    facts: [{ id: "cost-fact", text: "Variable cost rose 20%." }],
    investigationNodes: [
      {
        id: "costs",
        conceptId: "variable_cost",
        label: "Break down costs",
        interviewerResponse: "Variable cost rose 20%.",
        factIds: ["cost-fact"],
        exhibitIds: ["cost-exhibit"],
        prerequisiteNodeIds: [],
        critical: true,
        rootCause: false,
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
        columns: ["Category", "Current"],
        rows: [["Variable cost", 12]],
        series: [],
        insights: [
          {
            id: "cost-up",
            label: "Variable cost explains the decline.",
            strength: 1,
          },
        ],
      },
    ],
    calculations: [],
    frameworkRubric: {
      concepts: [
        { conceptId: "revenue", weight: 1, required: true },
        { conceptId: "variable_cost", weight: 2, required: true },
      ],
      overlapGroups: [["fixed_cost", "variable_cost"]],
      priorityConceptIds: ["variable_cost"],
    },
    recommendation: {
      minimumEvidence: 1,
      decisions: [
        {
          id: "fix-costs",
          label: "Address variable costs",
          supportingEvidenceIds: ["cost-fact"],
          weight: 1,
        },
      ],
      risks: [{ id: "service-risk", label: "Service levels could fall." }],
      nextSteps: [{ id: "pilot", label: "Pilot the change." }],
    },
    efficientPaths: [
      { id: "cost-path", label: "Cost-first path", nodeIds: ["costs"] },
    ],
  };
}

describe("CaseDefinitionSchema", () => {
  it("accepts a complete deterministic case", () => {
    expect(CaseDefinitionSchema.safeParse(validCase()).success).toBe(true);
  });

  it("rejects a case without an objective", () => {
    const definition = validCase();
    Reflect.deleteProperty(definition, "objective");

    expect(CaseDefinitionSchema.safeParse(definition).success).toBe(false);
  });

  it("rejects an exhibit that references an unknown fact", () => {
    const definition = validCase();
    definition.exhibits[0].sourceFactIds = ["missing-fact"];

    const result = CaseDefinitionSchema.safeParse(definition);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("unknown fact");
    }
  });

  it("rejects a recommendation rubric with no evidence requirement", () => {
    const definition = validCase();
    definition.recommendation.minimumEvidence = 0;

    expect(CaseDefinitionSchema.safeParse(definition).success).toBe(false);
  });
});
