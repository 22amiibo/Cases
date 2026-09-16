import { describe, expect, it } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { CaseDefinitionSchema } from "./schema";
import {
  applyCaseEvent,
  createCaseSession,
  getAvailableActions,
  getRevealedFacts,
} from "./case-engine";

const alpineFit = CaseDefinitionSchema.parse(alpineFitContent);

describe("deterministic case engine", () => {
  it("starts with every authored fact hidden", () => {
    const session = createCaseSession(alpineFit);

    expect(session.currentStage).toBe("clarify");
    expect(getRevealedFacts(session)).toEqual([]);
  });

  it("reveals only the investigated node's facts", () => {
    const session = applyCaseEvent(createCaseSession(alpineFit), {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 1,
    });

    expect(getRevealedFacts(session).map((fact) => fact.id)).toEqual([
      "cost-growth",
    ]);
    expect(session.revealedExhibitIds).toEqual(["cost-category"]);
  });

  it("gates deeper nodes behind authored prerequisites", () => {
    const initialActions = getAvailableActions(createCaseSession(alpineFit));
    expect(initialActions.map((action) => action.id)).toEqual([
      "revenue",
      "costs",
    ]);

    const afterCosts = applyCaseEvent(createCaseSession(alpineFit), {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 1,
    });

    expect(getAvailableActions(afterCosts).map((action) => action.id)).toEqual([
      "revenue",
      "fixed_cost",
      "variable_cost",
    ]);
  });

  it("records repeated investigation without duplicating revealed facts", () => {
    const afterFirst = applyCaseEvent(createCaseSession(alpineFit), {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 1,
    });
    const afterRepeat = applyCaseEvent(afterFirst, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 2,
    });

    expect(afterRepeat.events).toHaveLength(2);
    expect(afterRepeat.revealedFactIds).toEqual(["cost-growth"]);
    expect(afterRepeat.revealedExhibitIds).toEqual(["cost-category"]);
  });

  it("moves through the authored interaction stages", () => {
    const clarify = createCaseSession(alpineFit);
    const structure = applyCaseEvent(clarify, {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    });
    const investigate = applyCaseEvent(structure, {
      type: "framework_submitted",
      conceptIds: ["revenue", "variable_cost"],
      priorityConceptId: "variable_cost",
      atMs: 2,
    });
    const recommend = applyCaseEvent(investigate, {
      type: "synthesis_submitted",
      evidenceIds: ["cost-growth"],
      nextStepNodeId: "variable_cost",
      atMs: 3,
    });
    const complete = applyCaseEvent(recommend, {
      type: "recommendation_submitted",
      decisionId: "stabilize-staffing",
      evidenceIds: ["labor-growth", "overtime-spike"],
      riskId: "retention-cost",
      nextStepId: "six-club-pilot",
      atMs: 4,
    });

    expect([
      clarify.currentStage,
      structure.currentStage,
      investigate.currentStage,
      recommend.currentStage,
      complete.currentStage,
    ]).toEqual(["clarify", "structure", "investigate", "recommend", "complete"]);
  });
});
