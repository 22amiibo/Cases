import { beforeEach, describe, expect, it, vi } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { CaseDefinitionSchema } from "@/core/schema";

vi.mock("@/content/cases", () => ({ getCaseDefinition: vi.fn() }));

import { getCaseDefinition } from "@/content/cases";
import { POST } from "./route";

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
      criteria: [{ id: "testable", label: "Makes a testable claim" }],
      comparison: { title: "Example", text: "Costs may be growing too quickly." },
      diagnosticRules: [],
    },
    update: {
      interactionId: "hypothesis-update",
      responseKind: "hypothesis_update",
      prompt: "Update using evidence.",
      scaffoldingLevel: "beginner",
      guidance: [],
      criteria: [{ id: "evidence", label: "Links evidence" }],
      comparison: { title: "Example", text: "Revise toward cost pressure." },
      diagnosticRules: [],
    },
    contradictions: [{ hypothesisId: "revenue-pressure", evidenceFactIds: ["cost-growth"] }],
  },
});

const response = {
  responseId: "hypothesis-1",
  interactionId: "initial-hypothesis",
  revision: 1,
  revisionOf: null,
  responseKind: "initial_hypothesis",
  text: "Revenue pressure is testable through price and volume.",
  committedAtMs: 3,
};

const events = [
  { type: "clarification_selected", clarificationId: "target-metric", atMs: 1 },
  {
    type: "framework_submitted",
    eventSchemaVersion: 2,
    branches: [{ conceptId: "revenue", children: [] }],
    priorityConceptId: "revenue",
    rationale: "Test revenue first.",
    atMs: 2,
  },
];

describe("hypothesis commitment projection", () => {
  beforeEach(() => vi.mocked(getCaseDefinition).mockReturnValue(definition));

  it("reveals authored review only after a valid response at the legal phase", async () => {
    const requestBody = { contentVersion: 2, events, phase: "initial", response };
    expect(JSON.stringify(requestBody)).not.toContain("Costs may be growing too quickly.");

    const result = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    const payload = await result.json();

    expect(result.status).toBe(200);
    expect(payload.reveal.comparison.text).toBe("Costs may be growing too quickly.");
    expect(payload.reveal.criteria).toEqual([
      { id: "testable", label: "Makes a testable claim" },
    ]);
  });

  it("does not reveal authored review before investigation or for the wrong phase", async () => {
    for (const body of [
      { contentVersion: 2, events: events.slice(0, 1), phase: "initial", response },
      { contentVersion: 2, events, phase: "update", response },
    ]) {
      const result = await POST(
        new Request("http://localhost/commit", {
          method: "POST",
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ caseId: definition.id }) },
      );
      expect(result.status).toBe(400);
      expect(JSON.stringify(await result.json())).not.toContain(
        "Costs may be growing too quickly.",
      );
    }
  });

  it("rejects a history containing an event the engine did not accept", async () => {
    const result = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          events: [
            ...events,
            {
              type: "recommendation_submitted",
              decisionId: "stabilize-staffing",
              evidenceIds: [],
              riskId: "retention-cost",
              nextStepId: "six-club-pilot",
              atMs: 3,
            },
          ],
          phase: "initial",
          response,
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );

    expect(result.status).toBe(400);
    expect(JSON.stringify(await result.json())).not.toContain(
      "Costs may be growing too quickly.",
    );
  });
});
