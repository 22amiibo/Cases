import { describe, expect, it } from "vitest";
import type { CommittedResponse } from "./schema";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  deferLearningCycleReveal,
  projectLearningCyclePrompt,
  restoreLearningCycleState,
  revealLearningCycleAfterCommit,
  serializeLearningCycleState,
  validateCompletedLearningCycleState,
  type AuthoredLearningCycle,
  type LearningCycleReveal,
} from "./learning-cycle";

const definition: AuthoredLearningCycle = {
  interactionId: "exhibit-interpretation-1",
  responseKind: "exhibit_interpretation",
  prompt: "Explain what changed, why it matters, and what you would test next.",
  scaffoldingLevel: "beginner",
  guidance: ["State the observation before the implication."],
  criteria: [
    { id: "observation", label: "Names the strongest comparison accurately" },
    { id: "implication", label: "Explains why the comparison matters" },
  ],
  comparison: {
    title: "One defensible interpretation",
    text: "Labor growth is the clearest outlier and warrants a location comparison.",
  },
  diagnosticRules: [
    {
      criterionId: "observation",
      when: "not_met",
      code: "comparison_missed",
      severity: "coaching",
    },
    {
      criterionId: "implication",
      when: "met",
      code: "strong_exhibit_chain",
      severity: "strength",
    },
  ],
};

const firstResponse: CommittedResponse = {
  responseId: "response-1",
  interactionId: definition.interactionId,
  revision: 1,
  revisionOf: null,
  responseKind: definition.responseKind,
  text: "Labor increased faster than every other category, so I would compare clubs.",
  committedAtMs: 100,
};

function committedReveal(): LearningCycleReveal {
  return revealLearningCycleAfterCommit(definition, firstResponse);
}

describe("generated response learning cycle", () => {
  it("keeps rubric criteria, diagnostic rules, and authored comparison out of the prompt", () => {
    const prompt = projectLearningCyclePrompt(definition);
    const serialized = JSON.stringify(prompt);

    expect(serialized).toContain(definition.prompt);
    expect(serialized).not.toContain("Names the strongest comparison");
    expect(serialized).not.toContain("comparison_missed");
    expect(serialized).not.toContain(definition.comparison.text);
  });

  it("defers authored comparisons and diagnostics for an interview response", () => {
    const deferred = deferLearningCycleReveal(definition, firstResponse);

    expect(deferred.criteria).toEqual(definition.criteria);
    expect(deferred.comparison.text).not.toContain(definition.comparison.text);
    expect(deferred.diagnosticRules).toEqual([]);
    expect(JSON.stringify(deferred)).not.toContain("comparison_missed");
  });

  it("rejects self-check, comparison, and retry transitions before commitment", () => {
    const state = createLearningCycleState(definition.interactionId);

    expect(() =>
      applyLearningCycleAction(state, {
        type: "self_check_submitted",
        outcomes: [],
      }),
    ).toThrow(/self-check/i);
    expect(() =>
      applyLearningCycleAction(state, { type: "comparison_viewed" }),
    ).toThrow(/comparison/i);
    expect(() =>
      applyLearningCycleAction(state, { type: "retry_started" }),
    ).toThrow(/retry/i);
  });

  it("moves through commit, self-check, comparison, and a linked retry", () => {
    const initial = createLearningCycleState(definition.interactionId);
    const committed = applyLearningCycleAction(initial, {
      type: "response_committed",
      response: firstResponse,
      reveal: committedReveal(),
    });
    const checked = applyLearningCycleAction(committed, {
      type: "self_check_submitted",
      outcomes: [
        { criterionId: "observation", met: false },
        { criterionId: "implication", met: true },
      ],
    });
    const compared = applyLearningCycleAction(checked, {
      type: "comparison_viewed",
    });
    const revising = applyLearningCycleAction(compared, {
      type: "retry_started",
    });
    const secondResponse: CommittedResponse = {
      ...firstResponse,
      responseId: "response-2",
      revision: 2,
      revisionOf: firstResponse.responseId,
      text: "Labor is the outlier; I would compare overtime and turnover by club.",
      committedAtMs: 200,
    };
    const revised = applyLearningCycleAction(revising, {
      type: "response_committed",
      response: secondResponse,
      reveal: revealLearningCycleAfterCommit(definition, secondResponse),
    });

    expect(checked.diagnostics).toEqual([
      {
        code: "comparison_missed",
        source: "self_assessment",
        severity: "coaching",
        responseId: "response-1",
      },
      {
        code: "strong_exhibit_chain",
        source: "self_assessment",
        severity: "strength",
        responseId: "response-1",
      },
    ]);
    expect(revised.phase).toBe("self_check");
    expect(revised.responses).toEqual([firstResponse, secondResponse]);
  });

  it("persists committed revisions and revealed state without persisting draft text", () => {
    const state = applyLearningCycleAction(
      createLearningCycleState(definition.interactionId),
      {
        type: "response_committed",
        response: firstResponse,
        reveal: committedReveal(),
      },
    );
    const serialized = serializeLearningCycleState(state);

    expect(serialized).toContain(firstResponse.text);
    expect(serialized).not.toContain("uncommitted draft");
    expect(restoreLearningCycleState(serialized, definition.interactionId)).toEqual(
      state,
    );
    expect(
      restoreLearningCycleState(serialized, "different-interaction"),
    ).toBeNull();
    expect(
      restoreLearningCycleState(
        JSON.stringify({ ...state, phase: "comparison", reveal: null }),
        definition.interactionId,
      ),
    ).toBeNull();
  });

  it("allows skipping only before a response is committed and reveals no answer", () => {
    const skipped = applyLearningCycleAction(
      createLearningCycleState(definition.interactionId),
      { type: "cycle_skipped" },
    );

    expect(skipped.phase).toBe("skipped");
    expect(skipped.reveal).toBeNull();
    expect(() =>
      applyLearningCycleAction(
        applyLearningCycleAction(
          createLearningCycleState(definition.interactionId),
          {
            type: "response_committed",
            response: firstResponse,
            reveal: committedReveal(),
          },
        ),
        { type: "cycle_skipped" },
      ),
    ).toThrow(/skip/i);
  });

  it("rebuilds completed evidence from authored rules and rejects tampered state", () => {
    let completed = applyLearningCycleAction(
      createLearningCycleState(definition.interactionId),
      {
        type: "response_committed",
        response: firstResponse,
        reveal: committedReveal(),
      },
    );
    completed = applyLearningCycleAction(completed, {
      type: "self_check_submitted",
      outcomes: [
        { criterionId: "observation", met: false },
        { criterionId: "implication", met: true },
      ],
    });
    completed = applyLearningCycleAction(completed, { type: "comparison_viewed" });
    completed = applyLearningCycleAction(completed, { type: "cycle_completed" });

    expect(validateCompletedLearningCycleState(completed, definition)).toEqual(completed);
    expect(validateCompletedLearningCycleState({
      ...completed,
      diagnostics: [{
        code: "strong_hypothesis_update",
        source: "system",
        severity: "strength",
        responseId: firstResponse.responseId,
      }],
    }, definition)).toBeNull();
    expect(validateCompletedLearningCycleState({
      ...completed,
      reveal: {
        ...completed.reveal,
        comparison: { title: "Forged", text: "Forged comparison" },
      },
    }, definition)).toBeNull();
  });
});
