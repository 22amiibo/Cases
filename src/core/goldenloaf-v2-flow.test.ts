import { describe, expect, it } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import { buildGeneratedCaseEvent } from "./case-learning";
import { applyCaseEvent, createCaseSession } from "./case-engine";
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
    text: "A committed process hypothesis with a falsifiable test.",
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

describe("GoldenLoaf V2 process hypotheses", () => {
  it.each(["demand-mix-pressure", "baking-changeover-constraint"] as const)(
    "accepts %s as a legal initial route",
    (hypothesisId) => {
      const definition = getCaseDefinition("goldenloaf-operations", 2)!;
      let session = createCaseSession(definition);
      let atMs = 1;
      session = applyCaseEvent(session, buildGeneratedCaseEvent({
        session,
        kind: "opening",
        cycle: completedCycle(definition.opening!.responseCycle, `${hypothesisId}-opening`, atMs),
        checkpoint: { questionIds: ["service-metric", "network-scope", "investment-constraint"] },
        atMs: atMs++,
      }));
      session = applyCaseEvent(session, {
        type: "framework_submitted",
        eventSchemaVersion: 2,
        branches: [
          { conceptId: "capacity", children: [{ conceptId: "utilization", children: [] }] },
          { conceptId: "volume", children: [{ conceptId: "mix", children: [] }] },
        ],
        priorityConceptId: hypothesisId === "demand-mix-pressure" ? "volume" : "capacity",
        rationale: "Test the leading cause while keeping the alternative open.",
        atMs: atMs++,
      });
      const initial = completedCycle(
        definition.hypothesisPractice!.initial,
        `${hypothesisId}-initial`,
        atMs,
      );
      const latest = initial.responses.at(-1)!;
      session = applyCaseEvent(session, {
        type: "hypothesis_formed",
        eventSchemaVersion: 2,
        hypothesisId,
        evidenceIds: [],
        revisionOfResponseId: null,
        responses: initial.responses,
        rubricOutcomes: initial.assessments.at(-1)!.outcomes,
        diagnostics: initial.diagnostics,
        rationale: latest.text,
        authoredComparisonViewed: true,
        atMs,
      });

      expect(session.events.at(-1)).toMatchObject({
        type: "hypothesis_formed",
        hypothesisId,
      });
      expect(session.currentStage).toBe("investigate");
    },
  );
});
