import { describe, expect, it } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { getCaseDefinition } from "@/content/cases";
import { CaseDefinitionSchema } from "./schema";
import {
  materializeCompletedCaseEvents,
  projectHypothesisPractice,
  toLearnerCaseDefinition,
  toLearnerCaseReview,
} from "./learner-case";
import type { CaseEvent } from "./schema";

describe("toLearnerCaseDefinition", () => {
  it("keeps case mode separate from authored scaffolding and removes interview hints", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    const practice = toLearnerCaseDefinition(definition, {
      mode: "practice",
      contentVersion: 2,
    });
    const interview = toLearnerCaseDefinition(definition, {
      mode: "interview",
      contentVersion: 2,
    });

    expect(practice).toMatchObject({ caseMode: "practice", scaffoldingLevel: "beginner" });
    expect(interview).toMatchObject({ caseMode: "interview", scaffoldingLevel: "beginner" });
    expect(interview.openingPrompt?.guidance).toEqual([]);
  });

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

  it("hides initial and update hypothesis options with future authored material", () => {
    const definition = CaseDefinitionSchema.parse({
      ...alpineFitContent,
      version: 2,
      hypothesisPractice: {
        options: [
          { id: "revenue-pressure", label: "Revenue pressure" },
          { id: "cost-pressure", label: "Cost pressure" },
        ],
        initial: {
          interactionId: "initial-hypothesis",
          responseKind: "initial_hypothesis",
          prompt: "State an initial hypothesis.",
          scaffoldingLevel: "beginner",
          guidance: [],
          criteria: [{ id: "testable", label: "Testable" }],
          comparison: { title: "Hidden", text: "Hidden initial comparison" },
          diagnosticRules: [],
        },
        update: {
          interactionId: "hypothesis-update",
          responseKind: "hypothesis_update",
          prompt: "Update with evidence.",
          scaffoldingLevel: "beginner",
          guidance: [],
          criteria: [{ id: "evidence", label: "Uses evidence" }],
          comparison: { title: "Hidden", text: "Hidden update comparison" },
          diagnosticRules: [],
        },
        contradictions: [{ hypothesisId: "revenue-pressure", evidenceFactIds: ["cost-growth"] }],
      },
    });
    const initial = projectHypothesisPractice(definition, []);
    expect(initial?.phase).toBe("initial");
    expect(initial).not.toHaveProperty("options");
    expect(JSON.stringify(initial)).not.toContain("Hidden initial comparison");
    expect(JSON.stringify(initial)).not.toContain("cost-growth");

    const formed = {
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
        text: "Revenue pressure is testable.",
        committedAtMs: 1,
      }],
      rubricOutcomes: [{ criterionId: "testable", met: true }],
      diagnostics: [],
      rationale: "Revenue pressure is testable.",
      authoredComparisonViewed: true as const,
      atMs: 1,
    };
    const update = projectHypothesisPractice(definition, [
      formed,
      { type: "node_investigated", nodeId: "costs", atMs: 2 },
    ]);
    expect(update?.phase).toBe("update");
    expect(update).not.toHaveProperty("options");
    expect(JSON.stringify(update)).not.toContain("Revenue pressure");
    expect(JSON.stringify(update)).not.toContain("Cost pressure");
  });
});

describe("toLearnerCaseReview", () => {
  it("projects AlpineFit display groups and prerequisite-derived indentation in authored order", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    const review = toLearnerCaseReview(definition, []);

    expect(
      review.nodes.map(({ id, displayCategory, displayDepth }) => ({
        id,
        displayCategory,
        displayDepth,
      })),
    ).toEqual([
      { id: "revenue", displayCategory: "Revenue", displayDepth: 0 },
      { id: "price", displayCategory: "Revenue", displayDepth: 1 },
      { id: "volume", displayCategory: "Revenue", displayDepth: 1 },
      { id: "costs", displayCategory: "Operating Costs", displayDepth: 0 },
      { id: "fixed_cost", displayCategory: "Operating Costs", displayDepth: 1 },
      { id: "variable_cost", displayCategory: "Operating Costs", displayDepth: 1 },
      { id: "labor", displayCategory: "Labor & Staffing", displayDepth: 0 },
      { id: "materials", displayCategory: "Operating Costs", displayDepth: 2 },
      { id: "overtime", displayCategory: "Labor & Staffing", displayDepth: 1 },
      { id: "vacancies", displayCategory: "Labor & Staffing", displayDepth: 1 },
      { id: "turnover", displayCategory: "Labor & Staffing", displayDepth: 2 },
    ]);
  });

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

  it("leaves deferred Interview exhibit interpretation unscored instead of awarding an inferred insight", () => {
    const definition = CaseDefinitionSchema.parse({ ...alpineFitContent, version: 2 });
    const review = toLearnerCaseReview(definition, [{
      type: "exhibit_interpretation_submitted",
      eventSchemaVersion: 2,
      exhibitId: "cost-category",
      responses: [{
        responseId: "interview-exhibit-response",
        interactionId: "cost-interpretation",
        revision: 1,
        revisionOf: null,
        responseKind: "exhibit_interpretation",
        text: "Labor costs increased.",
        committedAtMs: 1,
      }],
      rubricOutcomes: [{ criterionId: "response_recorded", met: false }],
      diagnostics: [],
      insightIds: [],
      authoredComparisonViewed: false,
      atMs: 1,
    }]);

    expect(review.exhibitScoreAvailable).toBe(false);
    expect(review.scores.find(({ id }) => id === "exhibit")).toBeUndefined();
  });

  it("materializes an Interview calculation diagnostic from the stored submission only in review", () => {
    const definition = CaseDefinitionSchema.parse({ ...alpineFitContent, version: 2 });
    const review = toLearnerCaseReview(definition, [{
      type: "calculation_submitted",
      eventSchemaVersion: 2,
      taskId: "incremental-overtime-expense",
      answer: 700000,
      unit: "$",
      responses: [{
        responseId: "interview-calculation-response",
        interactionId: "incremental-overtime-expense",
        revision: 1,
        revisionOf: null,
        responseKind: "calculation",
        text: "700000 $",
        committedAtMs: 1,
      }],
      rubricOutcomes: [{ criterionId: "response_recorded", met: false }],
      diagnostics: [],
      authoredComparisonViewed: false,
      atMs: 1,
    }]);

    expect(review.generatedResponses[0]).toMatchObject({
      kind: "calculation",
      diagnostics: [{ code: "arithmetic_error", source: "system", severity: "blocking" }],
    });
    expect(review.scores.find(({ id }) => id === "quantitative")?.value).toBe(0);
  });

  it("materializes deterministic deferred opening, calculation, and hypothesis diagnostics for debrief persistence", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    const events: CaseEvent[] = [
      {
        type: "case_opening_submitted",
        eventSchemaVersion: 2,
        responses: [{
          responseId: "opening-response",
          interactionId: definition.opening!.responseCycle.interactionId,
          revision: 1,
          revisionOf: null,
          responseKind: definition.opening!.responseCycle.responseKind,
          text: "Clarify the objective.",
          committedAtMs: 1,
        }],
        rubricOutcomes: [{ criterionId: "response_recorded", met: true }],
        diagnostics: [],
        questions: definition.clarificationOptions.slice(0, 1).map(({ id, response }) => ({ questionId: id, interviewerResponse: response })),
        authoredComparisonViewed: false,
        atMs: 1,
      },
      {
        type: "hypothesis_updated",
        eventSchemaVersion: 2,
        status: "retain",
        previousHypothesisId: "revenue-economics",
        hypothesisId: "revenue-economics",
        evidenceIds: ["cost-growth"],
        revisionOfResponseId: "initial-response",
        responses: [{
          responseId: "hypothesis-response",
          interactionId: definition.hypothesisPractice!.update.interactionId,
          revision: 1,
          revisionOf: null,
          responseKind: definition.hypothesisPractice!.update.responseKind,
          text: "Retain revenue economics.",
          committedAtMs: 2,
        }],
        rubricOutcomes: [{ criterionId: "response_recorded", met: true }],
        diagnostics: [],
        rationale: "Retain revenue economics.",
        authoredComparisonViewed: false,
        atMs: 2,
      },
      {
        type: "calculation_submitted",
        eventSchemaVersion: 2,
        taskId: "incremental-overtime-expense",
        answer: 700000,
        unit: "$",
        responses: [{
          responseId: "calculation-response",
          interactionId: definition.calculations[0].responseCycle!.interactionId,
          revision: 1,
          revisionOf: null,
          responseKind: definition.calculations[0].responseCycle!.responseKind,
          text: "700000 $",
          committedAtMs: 3,
        }],
        rubricOutcomes: [{ criterionId: "response_recorded", met: true }],
        diagnostics: [],
        authoredComparisonViewed: false,
        atMs: 3,
      },
    ];

    expect(materializeCompletedCaseEvents(definition, events).flatMap((event) =>
      "diagnostics" in event ? event.diagnostics.map(({ code }) => code) : [],
    )).toEqual(["low_value_question", "contradicted_hypothesis_retained", "arithmetic_error"]);
  });

  it("replays the complete hypothesis and evidence-linked revision chain without a score", () => {
    const definition = CaseDefinitionSchema.parse({ ...alpineFitContent, version: 2 });
    const review = toLearnerCaseReview(definition, [{
      type: "hypothesis_updated",
      eventSchemaVersion: 2,
      status: "revise",
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
        text: "Cost evidence changes the leading explanation.",
        committedAtMs: 2,
      }],
      rubricOutcomes: [{ criterionId: "evidence", met: true }],
      diagnostics: [{
        code: "strong_hypothesis_update",
        source: "system",
        severity: "strength",
        responseId: "hypothesis-2",
      }],
      rationale: "Cost evidence changes the leading explanation.",
      authoredComparisonViewed: true,
      atMs: 3,
    }]);
    expect(review.hypotheses[0]).toMatchObject({
      status: "revise",
      previousHypothesisId: "revenue-pressure",
      hypothesisId: "cost-pressure",
      evidenceIds: ["cost-growth"],
      revisionOfResponseId: "hypothesis-1",
    });
    expect(review.scores.some(({ id }) => id === "hypothesis")).toBe(false);
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
