import { describe, expect, it } from "vitest";
import { v2PracticeDefinitions } from "@/content/drills";
import type { CommittedResponse, V2PracticeDrillDefinition } from "./schema";
import {
  evaluateV2Checkpoint,
  projectV2PracticeDrill,
  revealV2PracticeAfterCommit,
} from "./v2-drill";

function definition(skillId: V2PracticeDrillDefinition["skillId"]) {
  const result = v2PracticeDefinitions.find((item) => item.skillId === skillId);
  if (!result) throw new Error(`Missing ${skillId} definition`);
  return result;
}

function responseFor(item: V2PracticeDrillDefinition): CommittedResponse {
  return {
    responseId: "response-1",
    interactionId: item.responseCycle.interactionId,
    revision: 1,
    revisionOf: null,
    responseKind: item.responseCycle.responseKind,
    text: "My committed reasoning",
    committedAtMs: 1,
  };
}

describe("V2 practice drills", () => {
  it.each(v2PracticeDefinitions)("keeps $skillId answer-bearing material hidden before commitment", (item) => {
    const serialized = JSON.stringify(projectV2PracticeDrill(item));
    expect(serialized).not.toContain(item.responseCycle.criteria[0].label);
    expect(serialized).not.toContain(item.responseCycle.comparison.text);
    expect(serialized).not.toContain("checkpoint");
  });

  it.each(v2PracticeDefinitions)("reveals a safe $skillId checkpoint after commitment", (item) => {
    const serialized = JSON.stringify(revealV2PracticeAfterCommit(item, responseFor(item)).checkpoint);
    expect(serialized).not.toContain("correctId");
    expect(serialized).not.toContain("successCode");
    expect(serialized).not.toContain("coachingCode");
    expect(serialized).not.toContain("expectedAnswer");
    expect(serialized).not.toContain("tolerance");
    expect(serialized).not.toContain("rubric");
    expect(serialized).not.toContain("correctEvidenceIds");
    expect(serialized).not.toContain("correctNextStepId");
  });

  it("evaluates every checkpoint deterministically and ties diagnostics to the response", () => {
    const cases: Array<[V2PracticeDrillDefinition["skillId"], unknown, string]> = [
      ["structure", {
        branches: [
          { conceptId: "revenue", children: [] },
          { conceptId: "fixed_cost", children: [] },
          { conceptId: "variable_cost", children: [] },
        ],
        priorityConceptId: "variable_cost",
        rationale: "Costs grew faster than revenue.",
      }, "strong_structure"],
      ["prioritization", { optionId: "cost-breakdown" }, "strong_priority"],
      ["quantitative", { answer: 756000, unit: "$" }, "strong_quantitative_reasoning"],
      ["exhibit", { optionId: "labor-outlier" }, "strong_exhibit_chain"],
      ["synthesis", {
        evidenceIds: ["overtime-spike", "turnover-link"],
        nextStepId: "staffing-pilot",
      }, "strong_synthesis"],
    ];

    cases.forEach(([skillId, submission, code]) => {
      expect(evaluateV2Checkpoint(definition(skillId), submission as never, "response-1"))
        .toEqual({ diagnostics: [{ code, source: "system", severity: "strength", responseId: "response-1" }] });
    });
  });

  it("keeps quantitative reasoning criteria separate from the numeric answer and unit", () => {
    const item = definition("quantitative");
    expect(item.responseCycle.criteria.map(({ id }) => id)).toEqual([
      "setup",
      "sense-check",
      "implication",
    ]);
    expect(evaluateV2Checkpoint(item, { answer: 756000, unit: "hours" }, "response-1")
      .diagnostics[0].code).toBe("unit_error");
    expect(evaluateV2Checkpoint(item, { answer: 75600, unit: "$" }, "response-1")
      .diagnostics[0].code).toBe("arithmetic_error");
  });
});
