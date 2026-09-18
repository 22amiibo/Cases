import { describe, expect, it } from "vitest";
import { v2PracticeDefinitions } from "@/content/drills";
import type { CommittedResponse, V2PracticeDrillDefinition } from "./schema";
import {
  evaluateV2Checkpoint,
  projectV2PracticeDrill,
  revealV2PracticeAfterCommit,
  type V2CheckpointSubmission,
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

  it("evaluates every authored checkpoint deterministically and ties diagnostics to the response", () => {
    const cases: Array<{ id: string; submission: V2CheckpointSubmission; code: string }> = [
      { id: "alpinefit-structure-v2", submission: {
        branches: [
          { conceptId: "revenue", children: [] },
          { conceptId: "fixed_cost", children: [] },
          { conceptId: "variable_cost", children: [] },
        ],
        priorityConceptId: "variable_cost",
        rationale: "Costs grew faster than revenue.",
      }, code: "strong_structure" },
      { id: "alpinefit-prioritization-v2", submission: { optionId: "cost-breakdown" }, code: "strong_priority" },
      { id: "alpinefit-quantitative-v2", submission: { answer: 756000, unit: "$" }, code: "strong_quantitative_reasoning" },
      { id: "alpinefit-exhibit-v2", submission: { optionId: "labor-outlier" }, code: "strong_exhibit_chain" },
      { id: "alpinefit-synthesis-v2", submission: {
        evidenceIds: ["overtime-spike", "turnover-link"],
        nextStepId: "staffing-pilot",
      }, code: "strong_synthesis" },
      { id: "quickcart-structure-v2", submission: {
        branches: [
          { conceptId: "demand", children: [] },
          { conceptId: "courier_capacity", children: [] },
          { conceptId: "dispatch_process", children: [] },
        ],
        priorityConceptId: "courier_capacity",
        rationale: "The decline is concentrated during evening peaks.",
      }, code: "strong_structure" },
      { id: "verdant-structure-v2", submission: {
        branches: [
          { conceptId: "market_attractiveness", children: [] },
          { conceptId: "customer_demand", children: [] },
          { conceptId: "unit_economics", children: [] },
        ],
        priorityConceptId: "customer_demand",
        rationale: "Weak customer demand could stop the launch.",
      }, code: "strong_structure" },
      { id: "meridian-prioritization-v2", submission: { optionId: "step-conversion" }, code: "strong_priority" },
      { id: "urbaneats-prioritization-v2", submission: { optionId: "repeat-by-segment" }, code: "strong_priority" },
      { id: "harborcart-quantitative-v2", submission: { answer: 768000, unit: "$" }, code: "strong_quantitative_reasoning" },
      { id: "northwind-quantitative-v2", submission: { answer: 672000, unit: "$" }, code: "strong_quantitative_reasoning" },
      { id: "beacon-exhibit-v2", submission: { optionId: "loss-making-mix" }, code: "strong_exhibit_chain" },
      { id: "cedarcare-exhibit-v2", submission: { optionId: "rate-improved" }, code: "strong_exhibit_chain" },
      { id: "aeroparts-synthesis-v2", submission: {
        evidenceIds: ["supplier-share", "defect-tripled", "assembly-stable"],
        nextStepId: "dual-source",
      }, code: "strong_synthesis" },
      { id: "brightlearn-synthesis-v2", submission: {
        evidenceIds: ["retention-lift", "cost-increase", "single-channel"],
        nextStepId: "second-channel",
      }, code: "strong_synthesis" },
    ];

    expect(cases).toHaveLength(v2PracticeDefinitions.length);
    cases.forEach(({ id, submission, code }) => {
      const item = v2PracticeDefinitions.find((candidate) => candidate.id === id);
      expect(item, `Missing authored checkpoint case for ${id}`).toBeDefined();
      expect(evaluateV2Checkpoint(item!, submission, "response-1"))
        .toMatchObject({ diagnostics: [{ code, source: "system", severity: "strength", responseId: "response-1" }] });
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

  it("returns educational quantitative feedback only after an answer is graded", () => {
    const item = definition("quantitative");
    const checkpoint = revealV2PracticeAfterCommit(item, responseFor(item)).checkpoint;

    expect(JSON.stringify(projectV2PracticeDrill(item))).not.toContain("756000");
    expect(JSON.stringify(checkpoint)).not.toContain("756000");
    expect(evaluateV2Checkpoint(item, { answer: 75600, unit: "%" }, "response-1"))
      .toMatchObject({
        feedback: {
          submittedAnswer: 75600,
          submittedUnit: "%",
          answerCorrect: false,
          unitCorrect: false,
          correctAnswer: 756000,
          correctUnit: "$",
          explanation: expect.stringContaining("756,000"),
        },
      });
  });
});
