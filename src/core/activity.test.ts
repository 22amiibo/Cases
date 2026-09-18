import { describe, expect, it } from "vitest";
import { createActivityRegistry } from "@/content/activities";
import {
  applyActivityEvent,
  ActivityAttemptSchema,
  ActivityDefinitionSchema,
  ActivityEventSchema,
  createActivityState,
  evaluateActivityCompletion,
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
        priorityOptions: [
          { id: "labor-first", label: "Prioritize labor", outcomeId: "strong" },
          { id: "all-first", label: "Prioritize all costs", outcomeId: "weak" },
        ],
        interpretationOptions: [
          { id: "margin", label: "Labor may pressure margin", outcomeId: "strong" },
          { id: "none", label: "There is no implication", outcomeId: "weak" },
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

  it("keeps a retired exact version available for history", () => {
    const registry = createActivityRegistry(
      [
        validActivity({ contentVersion: 1, status: "retired" }),
        validActivity({ contentVersion: 2 }),
      ],
      { "alpinefit-clarifying-v3": 2 },
    );
    expect(registry.get("alpinefit-clarifying-v3", 1)?.status).toBe("retired");
    expect(registry.getActive("alpinefit-clarifying-v3")?.contentVersion).toBe(2);
  });
});

describe("activity state transitions", () => {
  const definition = () => ActivityDefinitionSchema.parse(validActivity());
  const event = (
    type: string,
    atMs: number,
    values: Record<string, unknown> = {},
  ) => ActivityEventSchema.parse({
    eventId: `event-${atMs}`,
    type,
    atMs,
    ...values,
  });

  it("completes the legal outer flow and derives deterministic evidence", () => {
    const activity = definition();
    let state = createActivityState(activity);
    expect(state.phase).toBe("context");
    state = applyActivityEvent(activity, state, event("activity_started", 0));
    state = applyActivityEvent(activity, state, event("selection_committed", 1, {
      interactionId: "opening-question",
      selectedIds: ["objective"],
    }));
    expect(state).toMatchObject({ phase: "feedback", outcomeId: "strong" });
    state = applyActivityEvent(activity, state, event("retry_decided", 2, {
      interactionId: "opening-question",
      decision: "continue",
    }));
    state = applyActivityEvent(activity, state, event("takeaway_viewed", 3));
    state = applyActivityEvent(activity, state, event("activity_completed", 4));

    expect(state.phase).toBe("complete");
    expect(evaluateActivityCompletion(activity, state)).toMatchObject({
      outcomeId: "strong",
      diagnostics: [{
        code: "strong_opening",
        skillId: "clarification",
        source: "system",
        severity: "strength",
      }],
      skillEvidence: [{
        skillId: "clarification",
        source: "activity",
        contextId: "alpinefit-clarifying-v3",
        reviewed: true,
        retryOrTransfer: false,
      }],
    });
  });

  it("rejects illegal phases, decreasing time, and mismatched interaction events", () => {
    const activity = definition();
    const context = createActivityState(activity);
    expect(() => applyActivityEvent(
      activity,
      context,
      event("activity_completed", 0),
    )).toThrow(/not legal during context/i);
    const started = applyActivityEvent(
      activity,
      context,
      event("activity_started", 10),
    );
    expect(() => applyActivityEvent(
      activity,
      started,
      event("ranking_committed", 9, {
        interactionId: "opening-question",
        orderedIds: ["objective", "history"],
      }),
    )).toThrow(/event time/i);
    expect(() => applyActivityEvent(
      activity,
      started,
      event("ranking_committed", 11, {
        interactionId: "opening-question",
        orderedIds: ["objective", "history"],
      }),
    )).toThrow(/single_select/i);
  });

  it("preserves a retry and uses the latest reviewed outcome", () => {
    const activity = definition();
    let state = applyActivityEvent(
      activity,
      createActivityState(activity),
      event("activity_started", 0),
    );
    state = applyActivityEvent(activity, state, event("selection_committed", 1, {
      interactionId: "opening-question",
      selectedIds: ["history"],
    }));
    state = applyActivityEvent(activity, state, event("retry_decided", 2, {
      interactionId: "opening-question",
      decision: "retry",
    }));
    expect(state.phase).toBe("interaction");
    state = applyActivityEvent(activity, state, event("selection_committed", 3, {
      interactionId: "opening-question",
      selectedIds: ["objective"],
    }));
    state = applyActivityEvent(activity, state, event("retry_decided", 4, {
      interactionId: "opening-question",
      decision: "continue",
    }));
    state = applyActivityEvent(activity, state, event("takeaway_viewed", 5));
    state = applyActivityEvent(activity, state, event("activity_completed", 6));

    expect(state.events).toHaveLength(7);
    expect(evaluateActivityCompletion(activity, state)).toMatchObject({
      outcomeId: "strong",
      skillEvidence: [{ retryOrTransfer: true }],
    });
  });

  it("requires generated retries to link sequential response revisions", () => {
    const activity = ActivityDefinitionSchema.parse(validActivity({
      interaction: {
        type: "generated_response",
        interactionId: "opening-response",
        responseCycle: {
          interactionId: "opening-response",
          responseKind: "case_opening",
          prompt: "Restate the objective.",
          scaffoldingLevel: "beginner",
          guidance: [],
          criteria: [{ id: "objective", label: "Restates the objective" }],
          comparison: { title: "Example", text: "A focused opening." },
          diagnosticRules: [],
        },
        outcomeIds: ["strong", "weak"],
      },
    }));
    const responseEvent = (atMs: number, response: Record<string, unknown>) =>
      event("generated_response_committed", atMs, {
        interactionId: "opening-response",
        response: {
          interactionId: "opening-response",
          responseKind: "case_opening",
          text: "A focused opening.",
          committedAtMs: atMs,
          ...response,
        },
      });
    let state = applyActivityEvent(
      activity,
      createActivityState(activity),
      event("activity_started", 0),
    );
    state = applyActivityEvent(activity, state, responseEvent(1, {
      responseId: "response-1",
      revision: 1,
      revisionOf: null,
    }));
    state = applyActivityEvent(activity, state, event("self_check_committed", 2, {
      interactionId: "opening-response",
      outcomes: [{ criterionId: "objective", met: false }],
    }));
    state = applyActivityEvent(activity, state, event("authored_comparison_viewed", 3, {
      interactionId: "opening-response",
    }));
    state = applyActivityEvent(activity, state, event("retry_decided", 4, {
      interactionId: "opening-response",
      decision: "retry",
    }));

    expect(() => applyActivityEvent(activity, state, responseEvent(5, {
      responseId: "response-2",
      revision: 2,
      revisionOf: "missing-response",
    }))).toThrow(/preceding response/i);
    expect(applyActivityEvent(activity, state, responseEvent(5, {
      responseId: "response-2",
      revision: 2,
      revisionOf: "response-1",
    })).phase).toBe("feedback");
  });

  it("requires each generated-response criterion exactly once", () => {
    const activity = ActivityDefinitionSchema.parse(validActivity({
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
            { id: "scope", label: "Defines the scope" },
          ],
          comparison: { title: "Example", text: "A focused opening." },
          diagnosticRules: [],
        },
        outcomeIds: ["strong", "weak"],
      },
    }));
    let state = applyActivityEvent(
      activity,
      createActivityState(activity),
      event("activity_started", 0),
    );
    state = applyActivityEvent(activity, state, event("generated_response_committed", 1, {
      interactionId: "opening-response",
      response: {
        responseId: "response-1",
        interactionId: "opening-response",
        responseKind: "case_opening",
        revision: 1,
        revisionOf: null,
        text: "We need to understand the decline and define the scope.",
        committedAtMs: 1,
      },
    }));

    expect(() => applyActivityEvent(activity, state, event("self_check_committed", 2, {
      interactionId: "opening-response",
      outcomes: [
        { criterionId: "objective", met: true },
        { criterionId: "objective", met: false },
      ],
    }))).toThrow(/exactly once/);
  });
});
