import { describe, expect, it } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { CaseDefinitionSchema } from "./schema";
import { toLearnerCaseDefinition, toLearnerCaseReview } from "./learner-case";
import type { CaseEvent } from "./schema";

describe("toLearnerCaseDefinition", () => {
  it("removes hidden scoring and causal metadata from the client payload", () => {
    const definition = CaseDefinitionSchema.parse(alpineFitContent);
    const learnerDefinition = toLearnerCaseDefinition(definition);
    const serialized = JSON.stringify(learnerDefinition);

    expect(serialized).not.toContain('"critical"');
    expect(serialized).not.toContain('"rootCause"');
    expect(serialized).not.toContain('"highValue"');
    expect(serialized).not.toContain('"frameworkRubric"');
    expect(serialized).not.toContain('"efficientPaths"');
    expect(serialized).not.toContain('"supportingEvidenceIds"');
    expect(serialized).not.toContain('"weight"');
    expect(serialized).not.toContain('"insights"');
  });
});

describe("toLearnerCaseReview", () => {
  it("replays V2 hierarchy, sibling order, priority, and rationale exactly", () => {
    const definition = CaseDefinitionSchema.parse({ ...alpineFitContent, version: 2 });
    const branches = [
      {
        conceptId: "variable_cost",
        children: [
          { conceptId: "labor", children: [] },
          { conceptId: "materials", children: [] },
        ],
      },
      { conceptId: "revenue", children: [] },
    ];
    const review = toLearnerCaseReview(definition, [
      {
        type: "framework_submitted",
        eventSchemaVersion: 2,
        branches,
        priorityConceptId: "labor",
        rationale: "Labor is both material and actionable.",
        atMs: 1,
      },
    ]);

    expect(review.framework).toEqual({
      branches,
      priorityConceptId: "labor",
      rationale: "Labor is both material and actionable.",
      source: "v2_hierarchy",
    });
  });

  it("adapts legacy flat concepts without inventing hierarchy", () => {
    const definition = CaseDefinitionSchema.parse(alpineFitContent);
    const review = toLearnerCaseReview(definition, [
      {
        type: "framework_submitted",
        conceptIds: ["revenue", "variable_cost", "labor"],
        priorityConceptId: "variable_cost",
        atMs: 1,
      },
    ]);

    expect(review.framework).toEqual({
      branches: [
        { conceptId: "revenue", children: [] },
        { conceptId: "variable_cost", children: [] },
        { conceptId: "labor", children: [] },
      ],
      priorityConceptId: "variable_cost",
      rationale: null,
      source: "legacy_flattened",
    });
  });

  it("preserves V2 exhibit revisions and structured evidence in replay", () => {
    const definition = CaseDefinitionSchema.parse({ ...alpineFitContent, version: 2 });
    const review = toLearnerCaseReview(definition, [{
      type: "exhibit_interpretation_submitted",
      eventSchemaVersion: 2,
      exhibitId: "cost-category",
      responses: [
        {
          responseId: "response-1",
          interactionId: "cost-interpretation",
          revision: 1,
          revisionOf: null,
          responseKind: "exhibit_interpretation",
          text: "Costs rose.",
          committedAtMs: 1,
        },
        {
          responseId: "response-2",
          interactionId: "cost-interpretation",
          revision: 2,
          revisionOf: "response-1",
          responseKind: "exhibit_interpretation",
          text: "Labor is the outlier, so compare clubs next.",
          committedAtMs: 2,
        },
      ],
      rubricOutcomes: [{ criterionId: "comparison", met: true }],
      diagnostics: [{
        code: "strong_exhibit_chain",
        source: "self_assessment",
        severity: "strength",
        responseId: "response-2",
      }],
      insightIds: ["labor-outlier"],
      authoredComparisonViewed: true,
      atMs: 3,
    }]);

    expect(review.exhibitInterpretations[0]).toMatchObject({
      exhibitId: "cost-category",
      responses: [
        { responseId: "response-1", revision: 1 },
        { responseId: "response-2", revision: 2, revisionOf: "response-1" },
      ],
      insightIds: ["labor-outlier"],
      authoredComparisonViewed: true,
    });
  });

  it("projects every replay state and deterministic branch feedback", () => {
    const definition = CaseDefinitionSchema.parse(alpineFitContent);
    const review = toLearnerCaseReview(definition, [
      { type: "node_investigated", nodeId: "revenue", atMs: 1 },
      { type: "node_investigated", nodeId: "costs", atMs: 2 },
      { type: "node_investigated", nodeId: "fixed_cost", atMs: 3 },
    ]);
    const states = new Map(review.nodes.map(({ id, state }) => [id, state]));

    expect(states.get("revenue")).toBe("visited");
    expect(states.get("costs")).toBe("critical-found");
    expect(states.get("turnover")).toBe("critical-missed");
    expect(states.get("price")).toBe("unvisited");
    expect(review.feedback.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["continued_low_value_branch", "missed_segmentation"]),
    );
  });

  it("ignores undiscovered evidence when checking cross-exhibit synthesis", () => {
    const definition = CaseDefinitionSchema.parse(alpineFitContent);
    const events: CaseEvent[] = [
      { type: "node_investigated", nodeId: "costs", atMs: 1 },
      { type: "node_investigated", nodeId: "variable_cost", atMs: 2 },
      { type: "node_investigated", nodeId: "labor", atMs: 3 },
      {
        type: "synthesis_submitted",
        evidenceIds: ["cost-growth", "variable-growth", "overtime-spike"],
        nextStepNodeId: "turnover",
        atMs: 5,
      },
      { type: "node_investigated", nodeId: "overtime", atMs: 6 },
    ];

    expect(
      toLearnerCaseReview(definition, events).feedback.map(({ code }) => code),
    ).not.toContain("strong_cross_exhibit_synthesis");
  });

  it("shows positive recommendation scoring and authored evidence-count guidance", () => {
    const definition = CaseDefinitionSchema.parse(alpineFitContent);
    const events: CaseEvent[] = [
      { type: "node_investigated", nodeId: "costs", atMs: 1 },
      { type: "node_investigated", nodeId: "variable_cost", atMs: 2 },
      { type: "node_investigated", nodeId: "labor", atMs: 3 },
      { type: "node_investigated", nodeId: "overtime", atMs: 4 },
      { type: "node_investigated", nodeId: "turnover", atMs: 5 },
      {
        type: "recommendation_submitted",
        decisionId: "stabilize-staffing",
        evidenceIds: ["overtime-spike", "turnover-link"],
        riskId: "retention-cost",
        nextStepId: "six-club-pilot",
        atMs: 6,
      },
    ];
    const review = toLearnerCaseReview(definition, events);

    expect(review.scores.find(({ id }) => id === "recommendation")?.value).toBe(1);
    expect(review.feedback.map(({ code }) => code)).not.toContain(
      "unsupported_recommendation",
    );

    const unsupported = toLearnerCaseReview(definition, [
      ...events.slice(0, -1),
      {
        type: "recommendation_submitted",
        decisionId: "stabilize-staffing",
        evidenceIds: ["overtime-spike"],
        riskId: "retention-cost",
        nextStepId: "six-club-pilot",
        atMs: 6,
      },
    ]);
    expect(
      unsupported.feedback.find(
        ({ code }) => code === "unsupported_recommendation",
      )?.message,
    ).toContain(String(definition.recommendation.minimumEvidence));
  });

  it("awards cross-exhibit feedback for one valid synthesis event", () => {
    const definition = CaseDefinitionSchema.parse(alpineFitContent);
    const events: CaseEvent[] = [
      { type: "node_investigated", nodeId: "costs", atMs: 1 },
      { type: "node_investigated", nodeId: "variable_cost", atMs: 2 },
      { type: "node_investigated", nodeId: "labor", atMs: 3 },
      { type: "node_investigated", nodeId: "overtime", atMs: 4 },
      { type: "node_investigated", nodeId: "turnover", atMs: 5 },
      {
        type: "synthesis_submitted",
        evidenceIds: ["cost-growth", "turnover-link"],
        nextStepNodeId: "turnover",
        atMs: 6,
      },
    ];

    expect(
      toLearnerCaseReview(definition, events).feedback.map(({ code }) => code),
    ).toContain("strong_cross_exhibit_synthesis");
  });
});
