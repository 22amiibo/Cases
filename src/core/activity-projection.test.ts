import { describe, expect, it } from "vitest";
import { ActivityDefinitionSchema, createActivityState } from "./activity";
import { projectLearnerActivity } from "./activity-projection";

const feedback = {
  paths: [{
    id: "strong",
    classification: "strong",
    diagnosticCodes: ["strong_hypothesis_update"],
    explanation: "Hidden explanation.",
    principle: "Hidden principle.",
    nextAction: "Hidden next action.",
  }, {
    id: "weak",
    classification: "weak",
    diagnosticCodes: ["update_missing"],
    explanation: "Hidden weak explanation.",
    principle: "Hidden weak principle.",
    nextAction: "Hidden weak action.",
  }],
};

function hypothesisActivity() {
  return ActivityDefinitionSchema.parse({
    id: "alpinefit-hypothesis-v3",
    contentVersion: 3,
    eventSchemaVersion: 3,
    scoringVersion: "v3",
    status: "active",
    title: "Update an AlpineFit hypothesis",
    labId: "hypothesis",
    primarySkillId: "hypothesis",
    secondarySkillIds: [],
    difficulty: "beginner",
    estimatedMinutes: 10,
    caseTypeIds: ["profitability"],
    industryIds: ["fitness"],
    interaction: {
      type: "hypothesis_sequence",
      interactionId: "alpinefit-hypothesis",
      prompt: "Form a testable starting hypothesis.",
      hypotheses: [
        { id: "revenue", label: "Revenue pressure is the cause" },
        { id: "labor", label: "Labor pressure is the cause" },
      ],
      evidenceSteps: [{
        id: "cost-step",
        evidenceId: "cost-growth",
        text: "Labor grew faster than revenue.",
        contradictedHypothesisIds: ["revenue"],
      }, {
        id: "club-step",
        evidenceId: "club-concentration",
        text: "Overtime is concentrated in six clubs.",
        contradictedHypothesisIds: ["revenue"],
      }],
      outcomeIds: ["strong", "weak"],
    },
    feedback,
    takeaway: "Update the claim when contrary evidence appears.",
  });
}

describe("projectLearnerActivity", () => {
  it("removes authored answers, classifications, feedback, and future evidence before commit", () => {
    const activity = hypothesisActivity();
    const projection = projectLearnerActivity(
      activity,
      createActivityState(activity),
    );
    const serialized = JSON.stringify(projection);

    expect(projection).toMatchObject({
      id: "alpinefit-hypothesis-v3",
      contentVersion: 3,
      interaction: {
        type: "hypothesis_sequence",
        interactionId: "alpinefit-hypothesis",
        prompt: "Form a testable starting hypothesis.",
      },
    });
    for (const hidden of [
      "classification",
      "diagnosticCodes",
      "outcomeId",
      "outcomeIds",
      "feedback",
      "takeaway",
      "contradictedHypothesisIds",
      "Labor pressure is the cause",
      "Labor grew faster than revenue",
      "Hidden explanation",
    ]) {
      expect(serialized).not.toContain(hidden);
    }
  });

  it("fails safely when an exact activity version is unavailable", () => {
    expect(() => projectLearnerActivity(undefined)).toThrow(/version not found/i);
  });
});
