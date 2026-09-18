import { describe, expect, it } from "vitest";
import { getDrillDefinition } from "@/content/drills";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  type LearningCycleReveal,
} from "@/core/learning-cycle";
import type { V2PracticeDrillDefinition } from "@/core/schema";
import { POST as commit } from "../commit/route";
import { POST } from "./route";

const definition = getDrillDefinition(
  "alpinefit-quantitative-v2",
  2,
) as V2PracticeDrillDefinition;

function committedResponse() {
  return {
    responseId: "quantitative-response",
    interactionId: definition.responseCycle.interactionId,
    revision: 1,
    revisionOf: null,
    responseKind: definition.responseCycle.responseKind,
    text: "Six clubs times annual hours times the hourly premium.",
    committedAtMs: 1,
  };
}

function completedCycle(reveal: LearningCycleReveal) {
  const response = committedResponse();
  let cycle = createLearningCycleState(definition.responseCycle.interactionId);
  cycle = applyLearningCycleAction(cycle, {
    type: "response_committed",
    response,
    reveal,
  });
  cycle = applyLearningCycleAction(cycle, {
    type: "self_check_submitted",
    outcomes: definition.responseCycle.criteria.map(({ id }) => ({
      criterionId: id,
      met: true,
    })),
  });
  cycle = applyLearningCycleAction(cycle, { type: "comparison_viewed" });
  return applyLearningCycleAction(cycle, { type: "cycle_completed" });
}

async function complete(body: unknown) {
  return POST(
    new Request("http://localhost/api/drills/alpinefit-quantitative-v2/complete", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ drillId: definition.id }) },
  );
}

describe("V2 drill completion", () => {
  it("does not reveal quantitative answers for an arbitrary response ID", async () => {
    const result = await complete({
      responseId: "made-up-response",
      submission: { answer: 1, unit: "%" },
    });
    const payload = JSON.stringify(await result.json());

    expect(result.status).toBe(400);
    expect(payload).not.toContain(String(definition.checkpoint.kind === "quantitative"
      ? definition.checkpoint.expectedAnswer
      : "unexpected"));
    expect(payload).not.toContain(definition.responseCycle.comparison.text);
  });

  it("grades a checkpoint after a canonical completed learning cycle", async () => {
    const commitment = await commit(
      new Request("http://localhost/api/drills/alpinefit-quantitative-v2/commit", {
        method: "POST",
        body: JSON.stringify({ response: committedResponse() }),
      }),
      { params: Promise.resolve({ drillId: definition.id }) },
    );
    expect(commitment.status).toBe(200);
    const committed = await commitment.json();
    const result = await complete({
      cycle: completedCycle(committed.reveal),
      submission: { answer: 756000, unit: "$" },
    });

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toMatchObject({
      diagnostics: [{
        code: "strong_quantitative_reasoning",
        responseId: "quantitative-response",
      }],
      feedback: { correctAnswer: 756000, correctUnit: "$" },
    });
  });
});
