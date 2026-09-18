import { describe, expect, it } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import { POST } from "./route";

const definition = getCaseDefinition("alpinefit-profitability", 2)!;
const opening = definition.opening!.responseCycle;
const openingQuestion = definition.clarificationOptions[0];

const investigationEvents = [
  {
    type: "case_opening_submitted",
    eventSchemaVersion: 2,
    responses: [{
      responseId: "opening-response",
      interactionId: opening.interactionId,
      revision: 1,
      revisionOf: null,
      responseKind: opening.responseKind,
      text: "Clarify the margin objective and scope.",
      committedAtMs: 1,
    }],
    rubricOutcomes: opening.criteria.map(({ id }) => ({ criterionId: id, met: true })),
    diagnostics: [{
      code: "low_value_question",
      source: "system",
      severity: "coaching",
      responseId: "opening-response",
    }],
    questions: [{
      questionId: openingQuestion.id,
      interviewerResponse: openingQuestion.response,
    }],
    authoredComparisonViewed: true,
    atMs: 1,
  },
  {
    type: "framework_submitted",
    eventSchemaVersion: 2,
    branches: [
      { conceptId: "revenue", children: [] },
      { conceptId: "variable_cost", children: [] },
    ],
    priorityConceptId: "variable_cost",
    rationale: "Test cost pressure first.",
    atMs: 2,
  },
];

describe("case learning-cycle commitment projection", () => {
  it("defers Interview Mode comparisons until the completed-case debrief", async () => {
    const result = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          mode: "interview",
          events: [],
          kind: "opening",
          response: {
            responseId: "opening-response",
            interactionId: opening.interactionId,
            revision: 1,
            revisionOf: null,
            responseKind: opening.responseKind,
            text: "Clarify the margin objective and scope.",
            committedAtMs: 1,
          },
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    const payload = JSON.stringify(await result.json());

    expect(result.status).toBe(200);
    expect(payload).not.toContain(opening.comparison.text);
    expect(payload).not.toContain(opening.diagnosticRules[0]?.code ?? "never");
  });

  it("does not reveal a calculation comparison before its prerequisites are met", async () => {
    const cycle = definition.calculations[0].responseCycle!;
    const requestBody = {
      contentVersion: 2,
      events: investigationEvents,
      kind: "calculation",
      itemId: definition.calculations[0].id,
      response: {
        responseId: "calculation-response",
        interactionId: cycle.interactionId,
        revision: 1,
        revisionOf: null,
        responseKind: cycle.responseKind,
        text: "I would multiply clubs, hours, and premium.",
        committedAtMs: 3,
      },
    };

    const result = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    const payload = JSON.stringify(await result.json());

    expect(result.status).toBe(400);
    expect(payload).not.toContain(cycle.comparison.text);
    expect(payload).not.toContain(cycle.criteria[0].label);
  });

  it("does not reveal synthesis material before the case is synthesis-ready", async () => {
    const cycle = definition.synthesis!.responseCycle;
    const result = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          events: investigationEvents,
          kind: "synthesis",
          response: {
            responseId: "synthesis-response",
            interactionId: cycle.interactionId,
            revision: 1,
            revisionOf: null,
            responseKind: cycle.responseKind,
            text: "Labor pressure is the likely cause.",
            committedAtMs: 3,
          },
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    const payload = JSON.stringify(await result.json());

    expect(result.status).toBe(400);
    expect(payload).not.toContain(cycle.comparison.text);
  });
});
