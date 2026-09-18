import { beforeEach, describe, expect, it, vi } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { CaseDefinitionSchema } from "@/core/schema";

vi.mock("@/content/cases", () => ({ getCaseDefinition: vi.fn() }));
vi.mock("@/content/cases/metadata", () => ({
  getCaseMetadata: vi.fn(() => ({ supportedModes: ["practice", "interview"] })),
}));

import { getCaseDefinition } from "@/content/cases";
import { POST } from "./route";

const definition = CaseDefinitionSchema.parse({
  ...alpineFitContent,
  version: 2,
  exhibits: alpineFitContent.exhibits.map((exhibit, index) =>
    index === 0
      ? {
          ...exhibit,
          interpretation: {
            interactionId: "cost-exhibit-interpretation",
            responseKind: "exhibit_interpretation",
            prompt: "Interpret this exhibit.",
            scaffoldingLevel: "beginner",
            guidance: ["Start with what changed."],
            criteria: [{ id: "comparison", label: "Names the strongest comparison" }],
            comparison: { title: "One example", text: "Labor is the cost outlier." },
            diagnosticRules: [{
              criterionId: "comparison",
              when: "not_met",
              code: "comparison_missed",
              severity: "coaching",
            }],
          },
        }
      : exhibit,
  ),
});

const response = {
  responseId: "response-1",
  interactionId: "cost-exhibit-interpretation",
  revision: 1,
  revisionOf: null,
  responseKind: "exhibit_interpretation",
  text: "Labor grew fastest, so compare performance by club.",
  committedAtMs: 4,
};

const events = [
  { type: "clarification_selected", clarificationId: "target-metric", atMs: 1 },
  {
    type: "framework_submitted",
    eventSchemaVersion: 2,
    branches: [{ conceptId: "variable_cost", children: [] }],
    priorityConceptId: "variable_cost",
    rationale: "Costs are the likely driver.",
    atMs: 2,
  },
  { type: "node_investigated", nodeId: "costs", atMs: 3 },
];

describe("exhibit commitment projection", () => {
  beforeEach(() => vi.mocked(getCaseDefinition).mockReturnValue(definition));

  it("reveals rubric and authored material only after a valid committed response", async () => {
    const requestBody = { contentVersion: 2, events, response };
    expect(JSON.stringify(requestBody)).not.toContain("Labor is the cost outlier.");
    expect(JSON.stringify(requestBody)).not.toContain("Names the strongest comparison");

    const result = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }),
      { params: Promise.resolve({ caseId: definition.id, exhibitId: "cost-category" }) },
    );
    const payload = await result.json();

    expect(result.status).toBe(200);
    expect(payload.reveal.comparison.text).toBe("Labor is the cost outlier.");
    expect(payload.reveal.criteria[0].label).toBe("Names the strongest comparison");
    expect(payload.insightOptions).toEqual(
      definition.exhibits[0].insights.map(({ id, label }) => ({ id, label })),
    );
    expect(JSON.stringify(payload)).not.toContain('"strength"');
  });

  it("defers authored exhibit review and rejects revisions in Interview Mode", async () => {
    const interview = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify({ contentVersion: 2, mode: "interview", events, response }),
      }),
      { params: Promise.resolve({ caseId: definition.id, exhibitId: "cost-category" }) },
    );
    expect(interview.status).toBe(200);
    const payload = await interview.json();
    expect(JSON.stringify(payload)).not.toContain("Labor is the cost outlier.");
    expect(payload.insightOptions).toEqual([]);

    const retry = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify({
          contentVersion: 2,
          mode: "interview",
          events,
          response: { ...response, responseId: "response-2", revision: 2, revisionOf: "response-1" },
        }),
      }),
      { params: Promise.resolve({ caseId: definition.id, exhibitId: "cost-category" }) },
    );
    expect(retry.status).toBe(400);
  });

  it("refuses to reveal answers before the exhibit is available", async () => {
    const result = await POST(
      new Request("http://localhost/commit", {
        method: "POST",
        body: JSON.stringify({ contentVersion: 2, events: events.slice(0, 2), response }),
      }),
      { params: Promise.resolve({ caseId: definition.id, exhibitId: "cost-category" }) },
    );

    expect(result.status).toBe(409);
  });
});
