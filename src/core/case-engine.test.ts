import { describe, expect, it } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { CaseDefinitionSchema } from "./schema";
import {
  applyCaseEvent,
  createCaseSession,
  getAvailableActions,
  getRevealedFacts,
  isCaseEventAllowed,
} from "./case-engine";

const alpineFit = CaseDefinitionSchema.parse(alpineFitContent);

const v2ExhibitDefinition = CaseDefinitionSchema.parse({
  ...alpineFitContent,
  version: 2,
  exhibits: alpineFitContent.exhibits.map((exhibit, index) =>
    index === 0
      ? {
          ...exhibit,
          interpretation: {
            interactionId: "cost-exhibit-interpretation",
            responseKind: "exhibit_interpretation",
            prompt: "What changed, why does it matter, and what next?",
            scaffoldingLevel: "beginner",
            guidance: ["Start with the strongest comparison."],
            criteria: [{ id: "comparison", label: "Names the strongest comparison" }],
            comparison: { title: "Example", text: "Labor is the outlier." },
            diagnosticRules: [],
          },
        }
      : exhibit,
  ),
});

const v2InterpretationEvent = {
  type: "exhibit_interpretation_submitted" as const,
  eventSchemaVersion: 2 as const,
  exhibitId: "cost-category",
  responses: [{
    responseId: "cost-response-1",
    interactionId: "cost-exhibit-interpretation",
    revision: 1,
    revisionOf: null,
    responseKind: "exhibit_interpretation",
    text: "Labor rose most, so I would compare clubs.",
    committedAtMs: 4,
  }],
  rubricOutcomes: [{ criterionId: "comparison", met: true }],
  diagnostics: [],
  insightIds: ["labor-outlier"],
  authoredComparisonViewed: true as const,
  atMs: 4,
};

const v2OpeningDefinition = CaseDefinitionSchema.parse({
  ...alpineFitContent,
  version: 2,
  opening: {
    responseCycle: {
      interactionId: "case-opening",
      responseKind: "objective_restatement",
      prompt: "Restate the objective.",
      scaffoldingLevel: "beginner",
      guidance: [],
      criteria: [{ id: "objective", label: "Restates the objective" }],
      comparison: { title: "Example", text: "Explain the margin decline." },
      diagnosticRules: [],
    },
    recommendedQuestionCount: 3,
    minimumHighValueQuestions: 2,
  },
});

const v2HypothesisDefinition = CaseDefinitionSchema.parse({
  ...alpineFitContent,
  version: 2,
  hypothesisPractice: {
    options: [
      { id: "revenue-pressure", label: "Revenue pressure is the main cause" },
      { id: "cost-pressure", label: "Cost pressure is the main cause" },
    ],
    initial: {
      interactionId: "initial-hypothesis",
      responseKind: "initial_hypothesis",
      prompt: "State your initial hypothesis.",
      scaffoldingLevel: "beginner",
      guidance: [],
      criteria: [{ id: "testable", label: "Makes a testable claim" }],
      comparison: { title: "Example", text: "Costs may be growing too quickly." },
      diagnosticRules: [],
    },
    update: {
      interactionId: "hypothesis-update",
      responseKind: "hypothesis_update",
      prompt: "Update your hypothesis using evidence.",
      scaffoldingLevel: "beginner",
      guidance: [],
      criteria: [{ id: "evidence", label: "Links evidence to the update" }],
      comparison: { title: "Example", text: "Revise toward cost pressure." },
      diagnosticRules: [{
        criterionId: "evidence",
        when: "not_met",
        code: "evidence_link_missing",
        severity: "blocking",
      }],
    },
    contradictions: [{ hypothesisId: "revenue-pressure", evidenceFactIds: ["cost-growth"] }],
  },
});

const initialHypothesisEvent = {
  type: "hypothesis_formed" as const,
  eventSchemaVersion: 2 as const,
  hypothesisId: "revenue-pressure",
  evidenceIds: [] as [],
  revisionOfResponseId: null,
  responses: [{
    responseId: "hypothesis-1",
    interactionId: "initial-hypothesis",
    revision: 1,
    revisionOf: null,
    responseKind: "initial_hypothesis",
    text: "Revenue pressure is testable by checking price and volume.",
    committedAtMs: 3,
  }],
  rubricOutcomes: [{ criterionId: "testable", met: true }],
  diagnostics: [],
  rationale: "Revenue pressure is testable by checking price and volume.",
  authoredComparisonViewed: true as const,
  atMs: 3,
};

function hypothesisSession() {
  let session = applyCaseEvent(createCaseSession(v2HypothesisDefinition), {
    type: "clarification_selected",
    clarificationId: "target-metric",
    atMs: 1,
  });
  session = applyCaseEvent(session, {
    type: "framework_submitted",
    eventSchemaVersion: 2,
    branches: [{ conceptId: "revenue", children: [] }],
    priorityConceptId: "revenue",
    rationale: "Test revenue first.",
    atMs: 2,
  });
  return session;
}

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

  it("locks visited investigations in Interview Mode while preserving Practice backtracking", () => {
    const session = createCaseSession(alpineFit, {
      mode: "interview",
      contentVersion: alpineFit.version,
    });
    const structured = applyCaseEvent(applyCaseEvent(session, {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    }), {
      type: "framework_submitted",
      conceptIds: ["revenue", "variable_cost"],
      priorityConceptId: "variable_cost",
      atMs: 2,
    });
    const investigated = applyCaseEvent(structured, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 3,
    });

    expect(applyCaseEvent(investigated, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 4,
    })).toBe(investigated);
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

  it("accepts canonical framework concepts even when they are not scored by this case", () => {
    const structure = applyCaseEvent(createCaseSession(alpineFit), {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    });
    const investigate = applyCaseEvent(structure, {
      type: "framework_submitted",
      conceptIds: ["customers", "mix", "risk"],
      priorityConceptId: "customers",
      atMs: 2,
    });

    expect(investigate.currentStage).toBe("investigate");
    expect(investigate.events).toHaveLength(2);
  });

  it("preserves an exact V2 framework tree and rejects mismatched event versions", () => {
    const v2Definition = CaseDefinitionSchema.parse({ ...alpineFitContent, version: 2 });
    const v2Structure = applyCaseEvent(createCaseSession(v2Definition), {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    });
    const nestedEvent = {
      type: "framework_submitted" as const,
      eventSchemaVersion: 2 as const,
      branches: [
        {
          conceptId: "revenue",
          children: [
            { conceptId: "price", children: [] },
            { conceptId: "volume", children: [] },
          ],
        },
        {
          conceptId: "variable_cost",
          children: [{ conceptId: "labor", children: [] }],
        },
      ],
      priorityConceptId: "labor",
      rationale: "Labor is the fastest-moving cost driver.",
      atMs: 2,
    };

    const v2Investigation = applyCaseEvent(v2Structure, nestedEvent);
    expect(v2Investigation.currentStage).toBe("investigate");
    expect(v2Investigation.events.at(-1)).toEqual(nestedEvent);

    const legacyEvent = {
      type: "framework_submitted" as const,
      conceptIds: ["revenue", "variable_cost"],
      priorityConceptId: "variable_cost",
      atMs: 2,
    };
    expect(applyCaseEvent(v2Structure, legacyEvent)).toBe(v2Structure);

    const v1Structure = applyCaseEvent(createCaseSession(alpineFit), {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    });
    expect(applyCaseEvent(v1Structure, nestedEvent)).toBe(v1Structure);
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

  it("gates V2 synthesis until each revealed exhibit has a committed interpretation", () => {
    let session = applyCaseEvent(createCaseSession(v2ExhibitDefinition), {
      type: "clarification_selected",
      clarificationId: "target-metric",
      atMs: 1,
    });
    session = applyCaseEvent(session, {
      type: "framework_submitted",
      eventSchemaVersion: 2,
      branches: [{ conceptId: "variable_cost", children: [] }],
      priorityConceptId: "variable_cost",
      rationale: "Costs grew faster than revenue.",
      atMs: 2,
    });
    session = applyCaseEvent(session, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 3,
    });
    const synthesis = {
      type: "synthesis_submitted" as const,
      evidenceIds: ["cost-growth"],
      nextStepNodeId: "variable_cost",
      atMs: 5,
    };

    expect(applyCaseEvent(session, synthesis)).toBe(session);
    expect(isCaseEventAllowed(session, { ...v2InterpretationEvent, insightIds: [] })).toBe(false);
    expect(isCaseEventAllowed(
      session,
      { ...v2InterpretationEvent, insightIds: [] },
      { mode: "interview", contentVersion: v2ExhibitDefinition.version },
    )).toBe(true);
    const interpreted = applyCaseEvent(session, v2InterpretationEvent);
    expect(interpreted.events.at(-1)).toEqual(v2InterpretationEvent);
    expect(applyCaseEvent(interpreted, synthesis).currentStage).toBe("recommend");
  });

  it("preserves a V2 opening and verifies every authored interviewer response", () => {
    const opening = {
      type: "case_opening_submitted" as const,
      eventSchemaVersion: 2 as const,
      responses: [{
        responseId: "opening-1",
        interactionId: "case-opening",
        revision: 1,
        revisionOf: null,
        responseKind: "objective_restatement",
        text: "Explain the margin decline.",
        committedAtMs: 1,
      }],
      rubricOutcomes: [{ criterionId: "objective", met: true }],
      diagnostics: [],
      questions: v2OpeningDefinition.clarificationOptions.slice(0, 2).map(
        ({ id, response }) => ({ questionId: id, interviewerResponse: response }),
      ),
      authoredComparisonViewed: true as const,
      atMs: 2,
    };
    const session = createCaseSession(v2OpeningDefinition);
    const structured = applyCaseEvent(session, opening);
    expect(structured.currentStage).toBe("structure");
    expect(structured.events[0]).toEqual(opening);
    expect(
      applyCaseEvent(session, {
        ...opening,
        questions: [{ questionId: opening.questions[0].questionId, interviewerResponse: "Forged" }],
      }),
    ).toBe(session);
  });

  it("rejects checkpoint retries in Interview Mode without changing Practice Mode", () => {
    const opening = {
      type: "case_opening_submitted" as const,
      eventSchemaVersion: 2 as const,
      responses: [
        {
          responseId: "opening-1",
          interactionId: "case-opening",
          revision: 1,
          revisionOf: null,
          responseKind: "objective_restatement",
          text: "Explain the margin decline.",
          committedAtMs: 1,
        },
        {
          responseId: "opening-2",
          interactionId: "case-opening",
          revision: 2,
          revisionOf: "opening-1",
          responseKind: "objective_restatement",
          text: "Explain the six-point EBITDA margin decline.",
          committedAtMs: 2,
        },
      ],
      rubricOutcomes: [{ criterionId: "objective", met: true }],
      diagnostics: [],
      questions: v2OpeningDefinition.clarificationOptions.slice(0, 2).map(
        ({ id, response }) => ({ questionId: id, interviewerResponse: response }),
      ),
      authoredComparisonViewed: true as const,
      atMs: 3,
    };
    const session = createCaseSession(v2OpeningDefinition);

    expect(isCaseEventAllowed(session, opening, { mode: "practice", contentVersion: 2 })).toBe(true);
    expect(isCaseEventAllowed(session, opening, { mode: "interview", contentVersion: 2 })).toBe(false);
  });

  it("requires an initial V2 hypothesis before investigation and an evidence-linked update before synthesis", () => {
    const initial = hypothesisSession();
    expect(applyCaseEvent(initial, { type: "node_investigated", nodeId: "costs", atMs: 4 })).toBe(initial);

    const formed = applyCaseEvent(initial, initialHypothesisEvent);
    const investigated = applyCaseEvent(formed, {
      type: "node_investigated",
      nodeId: "costs",
      atMs: 4,
    });
    expect(investigated.revealedFactIds).toContain("cost-growth");

    const synthesis = {
      type: "synthesis_submitted" as const,
      evidenceIds: ["cost-growth"],
      nextStepNodeId: "variable_cost",
      atMs: 6,
    };
    expect(applyCaseEvent(investigated, synthesis)).toBe(investigated);

    const update = {
      type: "hypothesis_updated" as const,
      eventSchemaVersion: 2 as const,
      status: "revise" as const,
      previousHypothesisId: "revenue-pressure",
      hypothesisId: "cost-pressure",
      evidenceIds: ["cost-growth"],
      revisionOfResponseId: "hypothesis-1",
      responses: [{
        responseId: "hypothesis-2",
        interactionId: "hypothesis-update",
        revision: 1,
        revisionOf: null,
        responseKind: "hypothesis_update",
        text: "Cost growth contradicts the revenue-led hypothesis.",
        committedAtMs: 5,
      }],
      rubricOutcomes: [{ criterionId: "evidence", met: true }],
      diagnostics: [{
        code: "strong_hypothesis_update" as const,
        source: "system" as const,
        severity: "strength" as const,
        responseId: "hypothesis-2",
      }],
      rationale: "Cost growth contradicts the revenue-led hypothesis.",
      authoredComparisonViewed: true as const,
      atMs: 5,
    };
    const updated = applyCaseEvent(investigated, update);
    expect(updated.events.at(-1)).toEqual(update);
    expect(applyCaseEvent(updated, synthesis).currentStage).toBe("recommend");

    const missingDerivedDiagnostic = {
      ...update,
      rubricOutcomes: [{ criterionId: "evidence", met: false }],
    };
    expect(applyCaseEvent(investigated, missingDerivedDiagnostic)).toBe(investigated);

    const forgedSeverity = {
      ...missingDerivedDiagnostic,
      diagnostics: [
        ...update.diagnostics,
        {
          code: "evidence_link_missing" as const,
          source: "self_assessment" as const,
          severity: "coaching" as const,
          responseId: "hypothesis-2",
        },
      ],
    };
    expect(applyCaseEvent(investigated, forgedSeverity)).toBe(investigated);
  });

  it("rejects unavailable evidence and diagnoses retaining a contradicted hypothesis", () => {
    const formed = applyCaseEvent(hypothesisSession(), initialHypothesisEvent);
    const forged = {
      type: "hypothesis_updated" as const,
      eventSchemaVersion: 2 as const,
      status: "retain" as const,
      previousHypothesisId: "revenue-pressure",
      hypothesisId: "revenue-pressure",
      evidenceIds: ["cost-growth"],
      revisionOfResponseId: "hypothesis-1",
      responses: [{
        responseId: "hypothesis-2",
        interactionId: "hypothesis-update",
        revision: 1,
        revisionOf: null,
        responseKind: "hypothesis_update",
        text: "I would retain the revenue hypothesis.",
        committedAtMs: 4,
      }],
      rubricOutcomes: [{ criterionId: "evidence", met: true }],
      diagnostics: [{
        code: "contradicted_hypothesis_retained" as const,
        source: "system" as const,
        severity: "blocking" as const,
        responseId: "hypothesis-2",
      }],
      rationale: "I would retain the revenue hypothesis.",
      authoredComparisonViewed: true as const,
      atMs: 4,
    };
    expect(applyCaseEvent(formed, forged)).toBe(formed);
    const withEvidence = applyCaseEvent(formed, { type: "node_investigated", nodeId: "costs", atMs: 4 });
    expect(applyCaseEvent(withEvidence, forged).events.at(-1)?.type).toBe("hypothesis_updated");
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
