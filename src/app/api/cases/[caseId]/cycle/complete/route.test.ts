import { describe, expect, it } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import { buildGeneratedCaseEvent } from "@/core/case-learning";
import { applyCaseEvent, createCaseSession } from "@/core/case-engine";
import { scoreCase } from "@/core/case-scoring";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  revealLearningCycleAfterCommit,
  type AuthoredLearningCycle,
} from "@/core/learning-cycle";
import { CaseEventSchema } from "@/core/schema";
import { POST } from "./route";

const definition = getCaseDefinition("alpinefit-profitability", 2)!;

function completedCycle(authored: AuthoredLearningCycle, responseId: string, atMs: number) {
  const response = {
    responseId,
    interactionId: authored.interactionId,
    revision: 1,
    revisionOf: null,
    responseKind: authored.responseKind,
    text: "A committed response with explicit reasoning.",
    committedAtMs: atMs,
  };
  let cycle = createLearningCycleState(authored.interactionId);
  cycle = applyLearningCycleAction(cycle, {
    type: "response_committed",
    response,
    reveal: revealLearningCycleAfterCommit(authored, response),
  });
  cycle = applyLearningCycleAction(cycle, {
    type: "self_check_submitted",
    outcomes: authored.criteria.map(({ id }) => ({ criterionId: id, met: true })),
  });
  cycle = applyLearningCycleAction(cycle, { type: "comparison_viewed" });
  return applyLearningCycleAction(cycle, { type: "cycle_completed" });
}

function sessionAtCalculation() {
  let atMs = 1;
  let session = createCaseSession(definition);
  session = applyCaseEvent(session, buildGeneratedCaseEvent({
    session,
    kind: "opening",
    cycle: completedCycle(definition.opening!.responseCycle, "opening-response", atMs),
    checkpoint: {
      questionIds: definition.clarificationOptions.slice(0, 3).map(({ id }) => id),
    },
    atMs: atMs++,
  }));
  session = applyCaseEvent(session, {
    type: "framework_submitted",
    eventSchemaVersion: 2,
    branches: [
      { conceptId: "revenue", children: [] },
      { conceptId: "variable_cost", children: [] },
    ],
    priorityConceptId: "variable_cost",
    rationale: "Test operating costs first.",
    atMs: atMs++,
  });
  const hypothesis = completedCycle(
    definition.hypothesisPractice!.initial,
    "hypothesis-response",
    atMs,
  );
  session = applyCaseEvent(session, {
    type: "hypothesis_formed",
    eventSchemaVersion: 2,
    hypothesisId: definition.hypothesisPractice!.options[0].id,
    evidenceIds: [],
    revisionOfResponseId: null,
    responses: hypothesis.responses,
    rubricOutcomes: hypothesis.assessments[0].outcomes,
    diagnostics: hypothesis.diagnostics,
    rationale: hypothesis.responses[0].text,
    authoredComparisonViewed: true,
    atMs: atMs++,
  });
  for (const nodeId of ["costs", "variable_cost", "labor", "overtime"]) {
    session = applyCaseEvent(session, {
      type: "node_investigated",
      nodeId,
      atMs: atMs++,
    });
  }
  return { session, atMs };
}

describe("case learning-cycle completion", () => {
  it("returns corrective feedback for a legal wrong-unit event without awarding credit", async () => {
    const { session, atMs } = sessionAtCalculation();
    const calculation = definition.calculations[0];
    const cycle = completedCycle(
      calculation.responseCycle!,
      "calculation-response",
      atMs,
    );
    const result = await POST(
      new Request("http://localhost/complete", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          events: session.events,
          kind: "calculation",
          itemId: calculation.id,
          cycle,
          checkpoint: { answer: calculation.expectedAnswer, unit: "%" },
          atMs,
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    const payload = await result.json();

    expect(result.status).toBe(200);
    expect(payload).toMatchObject({
      event: {
        type: "calculation_submitted",
        answer: calculation.expectedAnswer,
        unit: "%",
        diagnostics: [{ code: "unit_error", severity: "blocking" }],
      },
      feedback: {
        answerCorrect: true,
        unitCorrect: false,
        correctAnswer: calculation.expectedAnswer,
        correctUnit: calculation.unit,
      },
    });
    const event = CaseEventSchema.parse(payload.event);
    expect(applyCaseEvent(session, event).events.at(-1)).toEqual(event);
    expect(scoreCase(definition, [...session.events, event]).quantitative).toBe(0);
  });

  it("hides immediate correctness and rejects revised checkpoints in Interview Mode", async () => {
    const { session, atMs } = sessionAtCalculation();
    const interviewEvents = session.events.map((event) =>
      "diagnostics" in event
        ? { ...event, diagnostics: [], authoredComparisonViewed: false }
        : event,
    );
    const calculation = definition.calculations[0];
    const firstCycle = completedCycle(calculation.responseCycle!, "calculation-response", atMs);
    const retriedCycle = {
      ...firstCycle,
      responses: [...firstCycle.responses, {
        ...firstCycle.responses[0],
        responseId: "calculation-response-2",
        revision: 2,
        revisionOf: "calculation-response",
      }],
    };
    const retry = await POST(
      new Request("http://localhost/complete", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          mode: "interview",
          events: interviewEvents,
          kind: "calculation",
          itemId: calculation.id,
          cycle: retriedCycle,
          checkpoint: { answer: calculation.expectedAnswer, unit: "$" },
          atMs,
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    expect(retry.status).toBe(400);

    const firstAttempt = await POST(
      new Request("http://localhost/complete", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          mode: "interview",
          events: interviewEvents,
          kind: "calculation",
          itemId: calculation.id,
          cycle: firstCycle,
          checkpoint: { answer: calculation.expectedAnswer, unit: "%" },
          atMs,
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    expect(firstAttempt.status).toBe(200);
    const payload = await firstAttempt.json();
    expect(payload).not.toHaveProperty("feedback");
    expect(payload.event.authoredComparisonViewed).toBe(false);
  });
});
