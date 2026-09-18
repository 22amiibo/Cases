import { describe, expect, it } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import { buildCaseQuantitativeFeedback, buildGeneratedCaseEvent } from "./case-learning";
import { applyCaseEvent, createCaseSession, isSynthesisReady } from "./case-engine";
import { getHypothesisSystemDiagnostic } from "./hypothesis";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  revealLearningCycleAfterCommit,
  type AuthoredLearningCycle,
} from "./learning-cycle";
import type { CaseEvent } from "./schema";

type GeneratedCalculationEvent = Extract<
  CaseEvent,
  { type: "calculation_submitted"; eventSchemaVersion: 2 }
>;
type GeneratedSynthesisEvent = Extract<
  CaseEvent,
  { type: "synthesis_submitted"; eventSchemaVersion: 2 }
>;

function completedCycle(definition: AuthoredLearningCycle, responseId: string, atMs: number) {
  const response = {
    responseId,
    interactionId: definition.interactionId,
    revision: 1,
    revisionOf: null,
    responseKind: definition.responseKind,
    text: "A committed learner response with explicit reasoning.",
    committedAtMs: atMs,
  };
  let state = createLearningCycleState(definition.interactionId);
  state = applyLearningCycleAction(state, {
    type: "response_committed",
    response,
    reveal: revealLearningCycleAfterCommit(definition, response),
  });
  state = applyLearningCycleAction(state, {
    type: "self_check_submitted",
    outcomes: definition.criteria.map(({ id }) => ({ criterionId: id, met: true })),
  });
  state = applyLearningCycleAction(state, { type: "comparison_viewed" });
  return applyLearningCycleAction(state, { type: "cycle_completed" });
}

describe("AlpineFit complete V2 journey", () => {
  it("provides authored correction details after a quantitative answer is graded", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    const calculation = definition.calculations[0];

    expect(buildCaseQuantitativeFeedback(
      definition,
      calculation.id,
      { answer: 75600, unit: "%" },
    )).toMatchObject({
      submittedAnswer: 75600,
      submittedUnit: "%",
      answerCorrect: false,
      unitCorrect: false,
      correctAnswer: 756000,
      correctUnit: "$",
      explanation: expect.stringContaining("$756,000"),
    });
  });

  it("enforces and completes opening through generated recommendation", () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    let session = createCaseSession(definition);
    let atMs = 1;

    const openingCycle = completedCycle(definition.opening!.responseCycle, "opening-response", atMs);
    session = applyCaseEvent(session, buildGeneratedCaseEvent({
      session,
      kind: "opening",
      cycle: openingCycle,
      checkpoint: { questionIds: ["target-metric", "time-period", "case-scope"] },
      atMs: atMs++,
    }));
    expect(session.currentStage).toBe("structure");

    session = applyCaseEvent(session, {
      type: "framework_submitted",
      eventSchemaVersion: 2,
      branches: [
        { conceptId: "revenue", children: [{ conceptId: "price", children: [] }, { conceptId: "volume", children: [] }] },
        { conceptId: "variable_cost", children: [{ conceptId: "labor", children: [] }] },
      ],
      priorityConceptId: "labor",
      rationale: "Compare revenue economics with labor pressure.",
      atMs: atMs++,
    });

    const initial = completedCycle(definition.hypothesisPractice!.initial, "initial-hypothesis-response", atMs);
    const initialLatest = initial.responses.at(-1)!;
    session = applyCaseEvent(session, {
      type: "hypothesis_formed",
      eventSchemaVersion: 2,
      hypothesisId: "revenue-economics",
      evidenceIds: [],
      revisionOfResponseId: null,
      responses: initial.responses,
      rubricOutcomes: initial.assessments.at(-1)!.outcomes,
      diagnostics: initial.diagnostics,
      rationale: initialLatest.text,
      authoredComparisonViewed: true,
      atMs: atMs++,
    });

    session = applyCaseEvent(session, { type: "node_investigated", nodeId: "costs", atMs: atMs++ });
    const update = completedCycle(definition.hypothesisPractice!.update, "updated-hypothesis-response", atMs);
    const updateLatest = update.responses.at(-1)!;
    session = applyCaseEvent(session, {
      type: "hypothesis_updated",
      eventSchemaVersion: 2,
      status: "revise",
      previousHypothesisId: "revenue-economics",
      hypothesisId: "labor-pressure",
      evidenceIds: ["cost-growth"],
      revisionOfResponseId: initialLatest.responseId,
      responses: update.responses,
      rubricOutcomes: update.assessments.at(-1)!.outcomes,
      diagnostics: [
        ...update.diagnostics,
        getHypothesisSystemDiagnostic(definition, "revenue-economics", "revise", ["cost-growth"], updateLatest.responseId),
      ],
      rationale: updateLatest.text,
      authoredComparisonViewed: true,
      atMs: atMs++,
    });

    function interpret(exhibitId: string) {
      const exhibit = definition.exhibits.find(({ id }) => id === exhibitId)!;
      const cycle = completedCycle(exhibit.interpretation!, `${exhibitId}-response`, atMs);
      const event: CaseEvent = {
        type: "exhibit_interpretation_submitted",
        eventSchemaVersion: 2,
        exhibitId,
        responses: cycle.responses,
        rubricOutcomes: cycle.assessments.at(-1)!.outcomes,
        diagnostics: cycle.diagnostics,
        insightIds: [exhibit.insights[0].id],
        authoredComparisonViewed: true,
        atMs: atMs++,
      };
      session = applyCaseEvent(session, event);
    }

    interpret("cost-category");
    expect(isSynthesisReady(session)).toBe(false);
    for (const nodeId of ["variable_cost", "labor", "overtime"] as const) {
      session = applyCaseEvent(session, { type: "node_investigated", nodeId, atMs: atMs++ });
    }
    interpret("location-turnover");

    const calculation = definition.calculations[0];
    const calculationCycle = completedCycle(calculation.responseCycle!, "calculation-response", atMs);
    const calculationEvent = buildGeneratedCaseEvent({
      session,
      kind: "calculation",
      itemId: calculation.id,
      cycle: calculationCycle,
      checkpoint: { answer: 756000, unit: "$" },
      atMs: atMs++,
    }) as GeneratedCalculationEvent;
    expect(applyCaseEvent(session, {
      ...calculationEvent,
      diagnostics: calculationEvent.diagnostics.map((diagnostic) =>
        diagnostic.source === "system"
          ? { ...diagnostic, code: "arithmetic_error" as const }
          : diagnostic,
      ),
    })).toBe(session);
    session = applyCaseEvent(session, calculationEvent);
    expect(session.completedCalculationIds).toEqual([calculation.id]);

    session = applyCaseEvent(session, { type: "node_investigated", nodeId: "turnover", atMs: atMs++ });
    const synthesisCycle = completedCycle(definition.synthesis!.responseCycle, "synthesis-response", atMs);
    const synthesisEvent = buildGeneratedCaseEvent({
      session,
      kind: "synthesis",
      cycle: synthesisCycle,
      checkpoint: { evidenceIds: ["labor-growth", "overtime-spike", "turnover-link"], nextStepNodeId: "vacancies" },
      atMs: atMs++,
    }) as GeneratedSynthesisEvent;
    expect(applyCaseEvent(session, {
      ...synthesisEvent,
      evidenceIds: ["labor-growth", "labor-growth"],
    })).toBe(session);
    session = applyCaseEvent(session, synthesisEvent);
    expect(session.currentStage).toBe("recommend");

    const recommendationCycle = completedCycle(definition.recommendation.responseCycle!, "recommendation-response", atMs);
    session = applyCaseEvent(session, buildGeneratedCaseEvent({
      session,
      kind: "recommendation",
      cycle: recommendationCycle,
      checkpoint: {
        decisionId: "stabilize-staffing",
        evidenceIds: ["labor-growth", "overtime-spike", "incremental-labor"],
        riskId: "service-disruption",
        nextStepId: "six-club-pilot",
      },
      atMs: atMs++,
    }));
    expect(session.currentStage).toBe("complete");
    expect(session.events.some((event) =>
      event.type === "recommendation_submitted" && "responses" in event,
    )).toBe(true);
  });
});
