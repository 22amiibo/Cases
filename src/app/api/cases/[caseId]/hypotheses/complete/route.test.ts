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
      comparison: { title: "Example", text: "Test revenue first." },
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

const initialEvent = {
  type: "hypothesis_formed",
  eventSchemaVersion: 2,
  hypothesisId: "revenue-pressure",
  evidenceIds: [],
  revisionOfResponseId: null,
  responses: [{
    responseId: "hypothesis-1",
    interactionId: "initial-hypothesis",
    revision: 1,
    revisionOf: null,
    responseKind: "initial_hypothesis",
    text: "Revenue pressure is testable through price and volume.",
    committedAtMs: 3,
  }],
  rubricOutcomes: [{ criterionId: "testable", met: true }],
  diagnostics: [],
  rationale: "Revenue pressure is testable through price and volume.",
  authoredComparisonViewed: true,
  atMs: 3,
};

const updateResponse = {
  responseId: "hypothesis-2",
  interactionId: "hypothesis-update",
  revision: 1,
  revisionOf: null,
  responseKind: "hypothesis_update",
  text: "Cost growth contradicts the revenue-led hypothesis.",
  committedAtMs: 5,
};

const cycle = {
  interactionId: "hypothesis-update",
  phase: "complete",
  responses: [updateResponse],
  reveal: {
    criteria: [{ id: "evidence", label: "Links evidence" }],
    comparison: { title: "Example", text: "Revise toward cost pressure." },
    diagnosticRules: [],
  },
  assessments: [{
    responseId: "hypothesis-2",
    outcomes: [{ criterionId: "evidence", met: true }],
  }],
  diagnostics: [],
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
  initialEvent,
  { type: "node_investigated", nodeId: "costs", atMs: 4 },
];

describe("hypothesis completion", () => {
  beforeEach(() => vi.mocked(getCaseDefinition).mockReturnValue(definition));

  it("builds an evidence-linked revision with diagnostic evidence", async () => {
    const result = await POST(
      new Request("http://localhost/complete", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          events,
          phase: "update",
          cycle,
          hypothesisId: "cost-pressure",
          status: "revise",
          evidenceIds: ["cost-growth"],
          atMs: 6,
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );
    const payload = await result.json();

    expect(result.status).toBe(200);
    expect(payload.event).toMatchObject({
      type: "hypothesis_updated",
      status: "revise",
      previousHypothesisId: "revenue-pressure",
      hypothesisId: "cost-pressure",
      evidenceIds: ["cost-growth"],
      revisionOfResponseId: "hypothesis-1",
      rationale: updateResponse.text,
      diagnostics: [{
        code: "strong_hypothesis_update",
        source: "system",
        severity: "strength",
        responseId: "hypothesis-2",
      }],
    });
    expect(payload.event).not.toHaveProperty("score");
  });

  it("rejects unavailable evidence and invalid update semantics", async () => {
    for (const override of [
      { evidenceIds: ["revenue-growth"] },
      { evidenceIds: [] },
      { status: "invented" },
      { hypothesisId: "invented-hypothesis" },
      { hypothesisId: "revenue-pressure" },
    ]) {
      const result = await POST(
        new Request("http://localhost/complete", {
          method: "POST",
          body: JSON.stringify({
            contentVersion: 2,
            events,
            phase: "update",
            cycle,
            hypothesisId: "cost-pressure",
            status: "revise",
            evidenceIds: ["cost-growth"],
            atMs: 6,
            ...override,
          }),
        }),
        { params: Promise.resolve({ caseId: definition.id }) },
      );
      expect(result.status).toBe(400);
    }
  });

  it("rejects tampered cycle evidence and partially replayed histories", async () => {
    for (const override of [
      {
        cycle: {
          ...cycle,
          reveal: {
            ...cycle.reveal,
            comparison: { title: "Forged", text: "Forged comparison" },
          },
        },
      },
      {
        cycle: {
          ...cycle,
          diagnostics: [{
            code: "strong_hypothesis_update",
            source: "system",
            severity: "strength",
            responseId: "hypothesis-2",
          }],
        },
      },
      {
        events: [
          ...events,
          {
            type: "recommendation_submitted",
            decisionId: "stabilize-staffing",
            evidenceIds: [],
            riskId: "retention-cost",
            nextStepId: "six-club-pilot",
            atMs: 5,
          },
        ],
      },
    ]) {
      const result = await POST(
        new Request("http://localhost/complete", {
          method: "POST",
          body: JSON.stringify({
            contentVersion: 2,
            events,
            phase: "update",
            cycle,
            hypothesisId: "cost-pressure",
            status: "revise",
            evidenceIds: ["cost-growth"],
            atMs: 6,
            ...override,
          }),
        }),
        { params: Promise.resolve({ caseId: definition.id }) },
      );
      expect(result.status).toBe(400);
    }
  });
});
