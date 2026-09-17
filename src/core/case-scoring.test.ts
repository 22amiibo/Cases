import { describe, expect, it } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import type { CaseEvent } from "./schema";
import { CaseDefinitionSchema } from "./schema";
import { scoreCase } from "./case-scoring";

const alpineFit = CaseDefinitionSchema.parse(alpineFitContent);

function strongPath(extraEvents: CaseEvent[] = []): CaseEvent[] {
  return [
    {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    },
    {
      type: "framework_submitted",
      conceptIds: [
        "revenue",
        "fixed_cost",
        "variable_cost",
        "labor",
      ],
      priorityConceptId: "variable_cost",
      atMs: 2,
    },
    ...extraEvents,
    { type: "node_investigated", nodeId: "costs", atMs: 3 },
    { type: "node_investigated", nodeId: "variable_cost", atMs: 4 },
    { type: "node_investigated", nodeId: "labor", atMs: 5 },
    { type: "node_investigated", nodeId: "overtime", atMs: 6 },
    {
      type: "exhibit_insight_submitted",
      exhibitId: "cost-category",
      insightIds: ["labor-outlier"],
      atMs: 7,
    },
    {
      type: "exhibit_insight_submitted",
      exhibitId: "location-turnover",
      insightIds: ["overtime-turnover-link"],
      atMs: 8,
    },
    {
      type: "calculation_submitted",
      taskId: "incremental-overtime-expense",
      answer: 756000,
      atMs: 9,
    },
    { type: "node_investigated", nodeId: "turnover", atMs: 10 },
    {
      type: "synthesis_submitted",
      evidenceIds: ["labor-growth", "overtime-spike", "turnover-link"],
      nextStepNodeId: "turnover",
      atMs: 11,
    },
    {
      type: "recommendation_submitted",
      decisionId: "stabilize-staffing",
      evidenceIds: ["labor-growth", "overtime-spike", "turnover-link"],
      riskId: "retention-cost",
      nextStepId: "six-club-pilot",
      atMs: 12,
    },
  ];
}

describe("scoreCase", () => {
  it("scores a strong evidence-based path and separates diagnostics", () => {
    expect(scoreCase(alpineFit, strongPath())).toEqual({
      clarification: 1,
      structure: 0.686,
      prioritization: 1,
      quantitative: 1,
      exhibit: 1,
      synthesis: 1,
      recommendation: 1,
      diagnostic: {
        criticalNodesFound: [
          "costs",
          "variable_cost",
          "labor",
          "overtime",
          "turnover",
        ],
        criticalNodesMissed: [],
        lowValueInvestigations: [],
        repeatedInvestigations: [],
      },
    });
  });

  it("keeps an inefficient but correct investigation in diagnostics", () => {
    const events: CaseEvent[] = [
      ...strongPath([{ type: "node_investigated", nodeId: "revenue", atMs: 3 }]),
      { type: "node_investigated", nodeId: "price", atMs: 13 },
      { type: "node_investigated", nodeId: "fixed_cost", atMs: 14 },
      { type: "node_investigated", nodeId: "materials", atMs: 15 },
      { type: "node_investigated", nodeId: "overtime", atMs: 16 },
    ];

    const score = scoreCase(alpineFit, events);

    expect(score.recommendation).toBe(1);
    expect(score.synthesis).toBe(1);
    expect(score.diagnostic.lowValueInvestigations).toEqual([
      "price",
      "fixed_cost",
      "materials",
    ]);
    expect(score.diagnostic.repeatedInvestigations).toEqual(["overtime"]);
  });

  it("does not credit a guessed recommendation whose evidence was not discovered", () => {
    const score = scoreCase(alpineFit, [
      {
        type: "recommendation_submitted",
        decisionId: "stabilize-staffing",
        evidenceIds: ["labor-growth", "overtime-spike"],
        riskId: "retention-cost",
        nextStepId: "six-club-pilot",
        atMs: 1,
      },
    ]);

    expect(score.recommendation).toBe(0);
  });

  it("rejects an incorrect calculation without revealing its evidence", () => {
    const score = scoreCase(alpineFit, [
      { type: "node_investigated", nodeId: "costs", atMs: 1 },
      { type: "node_investigated", nodeId: "variable_cost", atMs: 2 },
      { type: "node_investigated", nodeId: "labor", atMs: 3 },
      { type: "node_investigated", nodeId: "overtime", atMs: 4 },
      {
        type: "calculation_submitted",
        taskId: "incremental-overtime-expense",
        answer: 700000,
        atMs: 5,
      },
    ]);

    expect(score.quantitative).toBe(0);
    expect(score.recommendation).toBe(0);
  });

  it("does not credit submissions made before later supporting investigations", () => {
    const score = scoreCase(alpineFit, [
      {
        type: "calculation_submitted",
        taskId: "incremental-overtime-expense",
        answer: 756000,
        atMs: 1,
      },
      {
        type: "synthesis_submitted",
        evidenceIds: ["labor-growth", "overtime-spike"],
        nextStepNodeId: "turnover",
        atMs: 2,
      },
      {
        type: "recommendation_submitted",
        decisionId: "stabilize-staffing",
        evidenceIds: ["labor-growth", "overtime-spike"],
        riskId: "retention-cost",
        nextStepId: "six-club-pilot",
        atMs: 3,
      },
      { type: "node_investigated", nodeId: "costs", atMs: 4 },
      { type: "node_investigated", nodeId: "variable_cost", atMs: 5 },
      { type: "node_investigated", nodeId: "labor", atMs: 6 },
      { type: "node_investigated", nodeId: "overtime", atMs: 7 },
    ]);

    expect(score.quantitative).toBe(0);
    expect(score.synthesis).toBe(0);
    expect(score.recommendation).toBe(0);
  });

  it("gives a legitimate authored alternate path the same credit", () => {
    const costFirst = scoreCase(alpineFit, strongPath());
    const revenueThenCost = scoreCase(
      alpineFit,
      strongPath([{ type: "node_investigated", nodeId: "revenue", atMs: 3 }]),
    );

    expect(revenueThenCost).toMatchObject({
      structure: costFirst.structure,
      prioritization: costFirst.prioritization,
      synthesis: costFirst.synthesis,
      recommendation: costFirst.recommendation,
    });
    expect(revenueThenCost.diagnostic.criticalNodesMissed).toEqual([]);
  });

  it("scores every concept in a nested V2 framework without flattening the event", () => {
    const v2Definition = CaseDefinitionSchema.parse({ ...alpineFitContent, version: 2 });
    const frameworkEvent: CaseEvent = {
      type: "framework_submitted",
      eventSchemaVersion: 2,
      branches: [
        {
          conceptId: "revenue",
          children: [
            { conceptId: "fixed_cost", children: [] },
            {
              conceptId: "variable_cost",
              children: [{ conceptId: "labor", children: [] }],
            },
          ],
        },
      ],
      priorityConceptId: "variable_cost",
      rationale: "Variable costs contain the likely driver.",
      atMs: 1,
    };

    expect(scoreCase(v2Definition, [frameworkEvent])).toMatchObject({
      structure: 0.686,
      prioritization: 1,
    });
    expect(frameworkEvent).toMatchObject({
      branches: [
        {
          conceptId: "revenue",
          children: [
            { conceptId: "fixed_cost" },
            { conceptId: "variable_cost", children: [{ conceptId: "labor" }] },
          ],
        },
      ],
    });
  });
});
