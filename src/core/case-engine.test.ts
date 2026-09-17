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

function sessionAtInvestigation() {
  const structured = applyCaseEvent(createCaseSession(alpineFit), {
    type: "clarification_selected",
    clarificationId: "target-metric",
    atMs: 1,
  });
  return applyCaseEvent(structured, {
    type: "framework_submitted",
    conceptIds: ["revenue", "variable_cost"],
    priorityConceptId: "variable_cost",
    atMs: 2,
  });
}

describe("deterministic case engine", () => {
  it("starts with every authored fact hidden", () => {
    const session = createCaseSession(alpineFit);

    expect(session.currentStage).toBe("clarify");
    expect(getRevealedFacts(session)).toEqual([]);
  });

  it("reveals only the investigated node's facts", () => {
    const session = applyCaseEvent(sessionAtInvestigation(), {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 3,
    });

    expect(getRevealedFacts(session).map((fact) => fact.id)).toEqual([
      "cost-growth",
    ]);
    expect(session.revealedExhibitIds).toEqual(["cost-category"]);
  });

  it("gates deeper nodes behind authored prerequisites", () => {
    const initialActions = getAvailableActions(sessionAtInvestigation());
    expect(initialActions.map((action) => action.id)).toEqual([
      "revenue",
      "costs",
    ]);

    const afterCosts = applyCaseEvent(sessionAtInvestigation(), {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 3,
    });

    expect(getAvailableActions(afterCosts).map((action) => action.id)).toEqual([
      "revenue",
      "fixed_cost",
      "variable_cost",
    ]);
  });

  it("records repeated investigation without duplicating revealed facts", () => {
    const investigation = sessionAtInvestigation();
    const afterFirst = applyCaseEvent(investigation, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 3,
    });
    const afterRepeat = applyCaseEvent(afterFirst, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 4,
    });

    expect(afterRepeat.events).toHaveLength(investigation.events.length + 2);
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
    const withEvidence = applyCaseEvent(investigate, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 3,
    });
    const recommend = applyCaseEvent(withEvidence, {
      type: "synthesis_submitted",
      evidenceIds: ["cost-growth"],
      nextStepNodeId: "variable_cost",
      atMs: 4,
    });
    const complete = applyCaseEvent(recommend, {
      type: "recommendation_submitted",
      decisionId: "raise-prices",
      evidenceIds: ["cost-growth"],
      riskId: "retention-cost",
      nextStepId: "six-club-pilot",
      atMs: 5,
    });

    expect([
      clarify.currentStage,
      structure.currentStage,
      investigate.currentStage,
      recommend.currentStage,
      complete.currentStage,
    ]).toEqual(["clarify", "structure", "investigate", "recommend", "complete"]);
  });

  it("rejects forged events that skip stages or cite undiscovered evidence", () => {
    const initial = createCaseSession(alpineFit);
    const forgedCompletion = applyCaseEvent(initial, {
      type: "recommendation_submitted",
      decisionId: "stabilize-staffing",
      evidenceIds: ["turnover-link"],
      riskId: "retention-cost",
      nextStepId: "six-club-pilot",
      atMs: 1,
    });

    expect(forgedCompletion).toBe(initial);

    const structure = applyCaseEvent(initial, {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    });
    const forgedFramework = applyCaseEvent(structure, {
      type: "framework_submitted",
      conceptIds: ["invented-concept"],
      priorityConceptId: "invented-concept",
      atMs: 2,
    });

    expect(forgedFramework).toBe(structure);
  });

  it("requires investigation and calculation prerequisites before recording events", () => {
    const investigate = applyCaseEvent(
      applyCaseEvent(createCaseSession(alpineFit), {
        type: "clarification_selected",
        clarificationId: "target-metric",
        atMs: 1,
      }),
      {
        type: "framework_submitted",
        conceptIds: ["revenue", "variable_cost"],
        priorityConceptId: "variable_cost",
        atMs: 2,
      },
    );

    expect(
      applyCaseEvent(investigate, {
        type: "node_investigated",
        nodeId: "turnover",
        atMs: 3,
      }),
    ).toBe(investigate);
    expect(
      applyCaseEvent(investigate, {
        type: "calculation_submitted",
        taskId: "incremental-overtime-expense",
        answer: 756000,
        atMs: 3,
      }),
    ).toBe(investigate);
  });

  it("validates authored recommendation choices and discovered evidence", () => {
    const withCosts = applyCaseEvent(sessionAtInvestigation(), {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 3,
    });
    const recommend = applyCaseEvent(withCosts, {
      type: "synthesis_submitted",
      evidenceIds: ["cost-growth"],
      nextStepNodeId: "variable_cost",
      atMs: 4,
    });

    expect(
      applyCaseEvent(recommend, {
        type: "recommendation_submitted",
        decisionId: "invented-decision",
        evidenceIds: ["cost-growth"],
        riskId: "retention-cost",
        nextStepId: "six-club-pilot",
        atMs: 5,
      }),
    ).toBe(recommend);
    expect(
      applyCaseEvent(recommend, {
        type: "recommendation_submitted",
        decisionId: "stabilize-staffing",
        evidenceIds: ["turnover-link"],
        riskId: "retention-cost",
        nextStepId: "six-club-pilot",
        atMs: 5,
      }),
    ).toBe(recommend);
  });
});
