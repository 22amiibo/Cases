import { describe, expect, it } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import { buildGeneratedCaseEvent } from "./case-learning";
import { applyCaseEvent, createCaseSession, isSynthesisReady } from "./case-engine";
import { getHypothesisSystemDiagnostic } from "./hypothesis";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  revealLearningCycleAfterCommit,
  type AuthoredLearningCycle,
} from "./learning-cycle";

function completedCycle(definition: AuthoredLearningCycle, responseId: string, atMs: number) {
  const response = {
    responseId,
    interactionId: definition.interactionId,
    revision: 1,
    revisionOf: null,
    responseKind: definition.responseKind,
    text: "A committed response that explains the strategic reasoning.",
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

function solve(initialHypothesisId: "installed-base-cross-sell" | "geographic-expansion") {
  const definition = getCaseDefinition("paypilot-growth", 2)!;
  let session = createCaseSession(definition);
  let atMs = 1;

  session = applyCaseEvent(session, buildGeneratedCaseEvent({
    session,
    kind: "opening",
    cycle: completedCycle(definition.opening!.responseCycle, `${initialHypothesisId}-opening`, atMs),
    checkpoint: { questionIds: ["decision-metric", "funding-constraint", "customer-scope"] },
    atMs: atMs++,
  }));
  session = applyCaseEvent(session, {
    type: "framework_submitted",
    eventSchemaVersion: 2,
    branches: [
      { conceptId: "customers", children: [{ conceptId: "volume", children: [] }] },
      { conceptId: "market_size", children: [{ conceptId: "competitors", children: [] }] },
      { conceptId: "variable_cost", children: [{ conceptId: "fixed_cost", children: [] }] },
    ],
    priorityConceptId: initialHypothesisId === "installed-base-cross-sell" ? "customers" : "market_size",
    rationale: "Compare demand, economics, and execution risk for both initiatives.",
    atMs: atMs++,
  });

  const initial = completedCycle(
    definition.hypothesisPractice!.initial,
    `${initialHypothesisId}-initial`,
    atMs,
  );
  const initialResponse = initial.responses.at(-1)!;
  session = applyCaseEvent(session, {
    type: "hypothesis_formed",
    eventSchemaVersion: 2,
    hypothesisId: initialHypothesisId,
    evidenceIds: [],
    revisionOfResponseId: null,
    responses: initial.responses,
    rubricOutcomes: initial.assessments.at(-1)!.outcomes,
    diagnostics: initial.diagnostics,
    rationale: initialResponse.text,
    authoredComparisonViewed: true,
    atMs: atMs++,
  });

  const route = initialHypothesisId === "installed-base-cross-sell"
    ? definition.efficientPaths[0].nodeIds
    : definition.efficientPaths[1].nodeIds;
  const updateAfter = initialHypothesisId === "installed-base-cross-sell"
    ? "cross-sell-economics"
    : "expansion-economics";
  for (const nodeId of route) {
    session = applyCaseEvent(session, { type: "node_investigated", nodeId, atMs: atMs++ });
    if (nodeId !== updateAfter) continue;

    const update = completedCycle(
      definition.hypothesisPractice!.update,
      `${initialHypothesisId}-update`,
      atMs,
    );
    const latest = update.responses.at(-1)!;
    const revising = initialHypothesisId === "geographic-expansion";
    const evidenceIds = revising
      ? ["expansion-net-profit"]
      : ["cross-sell-net-profit"];
    session = applyCaseEvent(session, {
      type: "hypothesis_updated",
      eventSchemaVersion: 2,
      status: revising ? "revise" : "retain",
      previousHypothesisId: initialHypothesisId,
      hypothesisId: revising ? "installed-base-cross-sell" : initialHypothesisId,
      evidenceIds,
      revisionOfResponseId: initialResponse.responseId,
      responses: update.responses,
      rubricOutcomes: update.assessments.at(-1)!.outcomes,
      diagnostics: [
        ...update.diagnostics,
        getHypothesisSystemDiagnostic(
          definition,
          initialHypothesisId,
          revising ? "revise" : "retain",
          evidenceIds,
          latest.responseId,
        ),
      ],
      rationale: latest.text,
      authoredComparisonViewed: true,
      atMs: atMs++,
    });
  }

  for (const exhibit of definition.exhibits) {
    const cycle = completedCycle(exhibit.interpretation!, `${exhibit.id}-response`, atMs);
    session = applyCaseEvent(session, {
      type: "exhibit_interpretation_submitted",
      eventSchemaVersion: 2,
      exhibitId: exhibit.id,
      responses: cycle.responses,
      rubricOutcomes: cycle.assessments.at(-1)!.outcomes,
      diagnostics: cycle.diagnostics,
      insightIds: [exhibit.insights[0].id],
      authoredComparisonViewed: true,
      atMs: atMs++,
    });
  }

  const calculation = definition.calculations[0];
  session = applyCaseEvent(session, buildGeneratedCaseEvent({
    session,
    kind: "calculation",
    itemId: calculation.id,
    cycle: completedCycle(calculation.responseCycle!, "paypilot-calculation", atMs),
    checkpoint: { answer: 1_800_000, unit: "$" },
    atMs: atMs++,
  }));
  expect(isSynthesisReady(session)).toBe(true);

  const synthesisEvent = buildGeneratedCaseEvent({
    session,
    kind: "synthesis",
    cycle: completedCycle(definition.synthesis!.responseCycle, "paypilot-synthesis", atMs),
    checkpoint: {
      evidenceIds: ["cross-sell-net-profit", "expansion-net-profit"],
      nextStepNodeId: initialHypothesisId === "installed-base-cross-sell"
        ? "retention-effect"
        : "local-competition",
    },
    atMs: atMs++,
  });
  session = applyCaseEvent(session, synthesisEvent);
  session = applyCaseEvent(session, buildGeneratedCaseEvent({
    session,
    kind: "recommendation",
    cycle: completedCycle(definition.recommendation.responseCycle!, "paypilot-recommendation", atMs),
    checkpoint: {
      decisionId: "choose-cross-sell",
      evidenceIds: ["cross-sell-net-profit", "expansion-net-profit"],
      riskId: "adoption-shortfall",
      nextStepId: "staged-cross-sell",
    },
    atMs: atMs++,
  }));
  return session;
}

describe("PayPilot complete V2 journey", () => {
  it.each(["installed-base-cross-sell", "geographic-expansion"] as const)(
    "supports the %s hypothesis route through a generated recommendation",
    (hypothesisId) => {
      const session = solve(hypothesisId);
      expect(session.currentStage).toBe("complete");
      expect(session.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: "hypothesis_formed", hypothesisId }),
        expect.objectContaining({ type: "hypothesis_updated" }),
        expect.objectContaining({ type: "recommendation_submitted", decisionId: "choose-cross-sell" }),
      ]));
      expect(session.events.filter(({ type }) => type === "exhibit_interpretation_submitted"))
        .toHaveLength(3);
    },
  );

  it("rejects an expansion hypothesis retained against decisive contrary evidence", () => {
    const definition = getCaseDefinition("paypilot-growth", 2)!;
    expect(getHypothesisSystemDiagnostic(
      definition,
      "geographic-expansion",
      "retain",
      ["expansion-net-profit"],
      "response-1",
    )).toMatchObject({
      code: "contradicted_hypothesis_retained",
      severity: "blocking",
    });
  });
});
