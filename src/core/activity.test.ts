import { describe, expect, it } from "vitest";
import { createActivityRegistry } from "@/content/activities";
import {
  ActivityAttemptSchema,
  ActivityDefinitionSchema,
  ActivityEventSchema,
} from "./activity";

function validActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: "alpinefit-clarifying-v3",
    contentVersion: 3,
    eventSchemaVersion: 3,
    scoringVersion: "v3",
    status: "active",
    title: "Clarify the AlpineFit decision",
    labId: "clarifying",
    primarySkillId: "clarification",
    secondarySkillIds: [],
    difficulty: "beginner",
    estimatedMinutes: 8,
    caseTypeIds: ["profitability"],
    industryIds: ["fitness"],
    interaction: {
      type: "single_select",
      interactionId: "opening-question",
      prompt: "Which question is most useful first?",
      options: [
        { id: "objective", label: "Clarify the objective", outcomeId: "strong" },
        { id: "history", label: "Ask for company history", outcomeId: "weak" },
      ],
      outcomeIds: ["strong", "weak"],
    },
    feedback: {
      paths: [
        {
          id: "strong",
          classification: "strong",
          diagnosticCodes: ["strong_opening"],
          explanation: "This resolves the decision before analysis starts.",
          principle: "Clarify the decision and success metric first.",
          nextAction: "Restate the objective in one sentence.",
        },
        {
          id: "weak",
          classification: "premature",
          diagnosticCodes: ["low_value_question"],
          explanation: "Company history does not resolve the immediate decision.",
          principle: "Start with information that can change the analysis.",
          nextAction: "Ask for the objective and scope.",
        },
      ],
    },
    takeaway: "Clarify the decision before requesting detail.",
    ...overrides,
  };
}

describe("ActivityDefinitionSchema", () => {
  it("accepts a complete V3 activity", () => {
    expect(ActivityDefinitionSchema.parse(validActivity())).toMatchObject({
      id: "alpinefit-clarifying-v3",
      contentVersion: 3,
      scoringVersion: "v3",
    });
  });

  it("rejects unknown taxonomies and duplicate local IDs", () => {
    expect(ActivityDefinitionSchema.safeParse(validActivity({
      primarySkillId: "analysis",
    })).success).toBe(false);
    expect(ActivityDefinitionSchema.safeParse(validActivity({
      interaction: {
        type: "single_select",
        interactionId: "opening-question",
        prompt: "Choose.",
        options: [
          { id: "same", label: "First", outcomeId: "strong" },
          { id: "same", label: "Second", outcomeId: "weak" },
        ],
        outcomeIds: ["strong", "weak"],
      },
    })).success).toBe(false);
  });

  it("requires one feedback path for every legal outcome", () => {
    const activity = validActivity();
    const feedback = activity.feedback.paths.slice(0, 1);
    expect(ActivityDefinitionSchema.safeParse({
      ...activity,
      feedback: { paths: feedback },
    }).success).toBe(false);
  });

  it("rejects invalid interaction-specific references", () => {
    expect(ActivityDefinitionSchema.safeParse(validActivity({
      interaction: {
        type: "categorization",
        interactionId: "question-categories",
        prompt: "Categorize each question.",
        categories: [{ id: "high", label: "High value" }],
        items: [{
          id: "objective",
          label: "What decision must we make?",
          acceptedCategoryIds: ["missing"],
        }],
        outcomeIds: ["strong", "weak"],
      },
    })).success).toBe(false);
  });

  it("rejects duplicate generated-response criteria and unknown exhibit outcomes", () => {
    expect(ActivityDefinitionSchema.safeParse(validActivity({
      interaction: {
        type: "generated_response",
        interactionId: "opening-response",
        responseCycle: {
          interactionId: "opening-response",
          responseKind: "case_opening",
          prompt: "Restate the objective.",
          scaffoldingLevel: "beginner",
          guidance: [],
          criteria: [
            { id: "objective", label: "Restates the objective" },
            { id: "objective", label: "Still restates the objective" },
          ],
          comparison: { title: "Example", text: "A focused opening." },
          diagnosticRules: [],
        },
        outcomeIds: ["strong", "weak"],
      },
    })).success).toBe(false);

    expect(ActivityDefinitionSchema.safeParse(validActivity({
      interaction: {
        type: "exhibit_chain",
        interactionId: "cost-exhibit",
        prompt: "Interpret the exhibit.",
        caseId: "alpinefit-profitability",
        caseContentVersion: 2,
        exhibitId: "cost-category",
        observationOptions: [
          { id: "labor", label: "Labor is the outlier", outcomeId: "missing" },
          { id: "flat", label: "Every category is flat", outcomeId: "weak" },
        ],
        actionOptions: [
          { id: "clubs", label: "Compare clubs", outcomeId: "strong" },
          { id: "history", label: "Ask for history", outcomeId: "weak" },
        ],
        outcomeIds: ["strong", "weak"],
      },
    })).success).toBe(false);
  });
});

describe("activity events and attempts", () => {
  it("validates ordered decision events without answer keys", () => {
    expect(ActivityEventSchema.parse({
      eventId: "event-1",
      type: "selection_committed",
      interactionId: "opening-question",
      selectedIds: ["objective"],
      atMs: 10,
    })).toEqual({
      eventId: "event-1",
      type: "selection_committed",
      interactionId: "opening-question",
      selectedIds: ["objective"],
      atMs: 10,
    });
  });

  it("requires complete course context and V3 metadata", () => {
    const attempt = {
      attemptId: "attempt-1",
      userId: "user-1",
      activityId: "alpinefit-clarifying-v3",
      contentVersion: 3,
      eventSchemaVersion: 3,
      scoringVersion: "v3",
      startedAt: "2026-09-18T12:00:00.000Z",
      completedAt: "2026-09-18T12:08:00.000Z",
      primarySkillId: "clarification",
      skillEvidence: [],
      diagnostics: [],
      courseContext: {
        courseId: "profitability-v3",
        courseVersion: 3,
        courseStepId: "clarifying",
      },
      events: [],
    };
    expect(ActivityAttemptSchema.safeParse(attempt).success).toBe(true);
    expect(ActivityAttemptSchema.safeParse({
      ...attempt,
      courseContext: { courseId: "profitability-v3" },
    }).success).toBe(false);
  });
});

describe("createActivityRegistry", () => {
  it("rejects duplicate versions and retired active selections", () => {
    expect(() => createActivityRegistry(
      [validActivity(), validActivity()],
      { "alpinefit-clarifying-v3": 3 },
    )).toThrow(/Duplicate content version/);
    expect(() => createActivityRegistry(
      [validActivity({ status: "retired" })],
      { "alpinefit-clarifying-v3": 3 },
    )).toThrow(/cannot be active/i);
  });

  it("rejects diagnostics owned by an undeclared skill", () => {
    const activity = validActivity();
    activity.feedback.paths[1].diagnosticCodes = ["hypothesis_missing"];
    expect(() => createActivityRegistry(
      [activity],
      { "alpinefit-clarifying-v3": 3 },
    )).toThrow(/not owned by a declared activity skill/i);
  });
});
