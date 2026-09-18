import { describe, expect, it } from "vitest";
import { ActivityEventSchema, applyActivityEvent, replayActivityEvents, evaluateActivityCompletion } from "@/core/activity";
import { projectLearnerActivity } from "@/core/activity-projection";
import {
  activeActivityVersions,
  activityDefinitions,
  getActivityDefinition,
} from ".";

const event = (type: string, atMs: number, values: Record<string, unknown> = {}) =>
  ActivityEventSchema.parse({ eventId: `event-${atMs}`, type, atMs, ...values });

function outcome(activityId: string, events: ReturnType<typeof event>[]) {
  const definition = getActivityDefinition(activityId, 1)!;
  let state = replayActivityEvents(definition, [
    event("activity_started", 0),
    ...events,
  ]);
  if (state.phase === "feedback") {
    state = replayActivityEvents(definition, [
      ...state.events,
      event("retry_decided", 90, {
        interactionId: definition.interaction.interactionId,
        decision: "continue",
      }),
      event("takeaway_viewed", 91),
      event("activity_completed", 92),
    ]);
  }
  return evaluateActivityCompletion(definition, state);
}

describe("V3 flagship activities", () => {
  it("publishes exactly one active activity for each flagship lab", () => {
    expect(activityDefinitions.map(({ labId }) => labId).sort()).toEqual([
      "brainstorming",
      "clarifying",
      "exhibit",
      "hypothesis",
    ]);
    expect(Object.keys(activeActivityVersions)).toHaveLength(4);
  });

  it("keeps authored feedback and future evidence out of every pre-commit projection", () => {
    const hiddenByActivity = {
      "alpinefit-clarifying-v3": [
        "Operating margin is operating profit divided by revenue",
        "low_value_question",
      ],
      "alpinefit-exhibit-v3": [
        "outcomeId",
        "You connected the labor outlier",
      ],
      "alpinefit-brainstorming-v3": [
        "redundantWithIds",
        "brainstorm_categories_overlap",
      ],
      "alpinefit-hypothesis-v3": [
        "Operating costs grew 17%",
        "contradictedHypothesisIds",
      ],
    } as const;
    for (const [activityId, hidden] of Object.entries(hiddenByActivity)) {
      const definition = getActivityDefinition(activityId, 1)!;
      const serialized = JSON.stringify(projectLearnerActivity(definition));
      hidden.forEach((value) => expect(serialized).not.toContain(value));
    }
  });

  it("classifies strong, reasonable, and weak Clarifying paths", () => {
    const choose = (selectedId: string) => outcome("alpinefit-clarifying-v3", [event(
      "selection_committed",
      1,
      { interactionId: "alpinefit-clarifying", selectedIds: [selectedId] },
    )]);
    expect(choose("metric-definition").feedback.classification).toBe("strong");
    expect(choose("time-period").feedback.classification).toBe("reasonable");
    expect(choose("logo-color").diagnostics).toMatchObject([{ code: "low_value_question" }]);
  });

  it("evaluates the four-stage Exhibit chain", () => {
    const events = [
      event("exhibit_committed", 1, { interactionId: "alpinefit-cost-chain", stage: "observe", selectedIds: ["labor-outlier"], response: "Labor rose by $6.2m, far more than other categories." }),
      event("exhibit_committed", 2, { interactionId: "alpinefit-cost-chain", stage: "prioritize", selectedIds: ["labor-priority"] }),
      event("exhibit_committed", 3, { interactionId: "alpinefit-cost-chain", stage: "interpret", selectedIds: ["margin-pressure"], response: "Labor is the leading margin-pressure candidate." }),
      event("exhibit_committed", 4, { interactionId: "alpinefit-cost-chain", stage: "act", selectedIds: ["location-cut"] }),
    ];
    expect(outcome("alpinefit-exhibit-v3", events).diagnostics).toMatchObject([
      { code: "strong_exhibit_chain", source: "system" },
    ]);
    events[3] = event("exhibit_committed", 4, { interactionId: "alpinefit-cost-chain", stage: "act", selectedIds: ["broad-cost-review"] });
    expect(outcome("alpinefit-exhibit-v3", events).feedback.classification).toBe("reasonable");
  });

  it("rewards structured Brainstorming coverage instead of raw count", () => {
    const commit = (selectedIdeaIds: string[], priorityIdeaIds: string[]) => outcome(
      "alpinefit-brainstorming-v3",
      [event("brainstorm_committed", 1, {
        interactionId: "alpinefit-profit-drivers",
        selectedIdeaIds,
        placements: selectedIdeaIds.map((ideaId) => ({
          ideaId,
          categoryId: ideaId.startsWith("revenue") ? "revenue" : ideaId.startsWith("labor") ? "labor" : "other-costs",
        })),
        priorityIdeaIds,
      })],
    );
    expect(commit(
      ["revenue-price", "labor-overtime", "other-occupancy"],
      ["labor-overtime"],
    ).diagnostics).toMatchObject([{ code: "strong_brainstorm" }]);
    expect(commit(
      ["revenue-price", "labor-overtime"],
      ["labor-overtime"],
    ).feedback.classification).toBe("reasonable");
    expect(commit(
      ["revenue-price", "revenue-price-duplicate", "other-logo"],
      ["revenue-price"],
    ).feedback.classification).toBe("weak");
  });

  it("distinguishes strong updates, defensible retention, and contradicted retention", () => {
    const run = (initialId: string, firstStatus: "retain" | "revise") => outcome(
      "alpinefit-hypothesis-v3",
      [
        event("hypothesis_committed", 1, { interactionId: "alpinefit-hypothesis", stepId: "initial", status: "form", hypothesisId: initialId, evidenceIds: [], rationale: "This is a testable starting claim." }),
        event("hypothesis_committed", 2, { interactionId: "alpinefit-hypothesis", stepId: "cost-growth", status: firstStatus, hypothesisId: firstStatus === "revise" ? "labor-pressure" : initialId, evidenceIds: ["cost-growth"], rationale: "Costs grew faster than revenue." }),
        event("hypothesis_committed", 3, { interactionId: "alpinefit-hypothesis", stepId: "overtime-spike", status: "retain", hypothesisId: firstStatus === "revise" ? "labor-pressure" : initialId, evidenceIds: ["overtime-spike"], rationale: "Overtime concentration supports the current claim." }),
      ],
    );
    expect(run("revenue-economics", "revise").diagnostics).toMatchObject([
      { code: "strong_hypothesis_update" },
    ]);
    expect(run("labor-pressure", "retain").feedback.classification).toBe("reasonable");
    expect(run("revenue-economics", "retain").diagnostics).toMatchObject([
      { code: "contradicted_hypothesis_retained" },
    ]);
  });

  it.each([
    ["alpinefit-clarifying-v3", [
      event("selection_committed", 1, { interactionId: "alpinefit-clarifying", selectedIds: ["logo-color"] }),
    ]],
    ["alpinefit-exhibit-v3", [
      event("exhibit_committed", 1, { interactionId: "alpinefit-cost-chain", stage: "observe", selectedIds: ["occupancy-outlier"], response: "Occupancy is largest." }),
      event("exhibit_committed", 2, { interactionId: "alpinefit-cost-chain", stage: "prioritize", selectedIds: ["all-categories"] }),
      event("exhibit_committed", 3, { interactionId: "alpinefit-cost-chain", stage: "interpret", selectedIds: ["labor-cause-proven"], response: "The cause is proven." }),
      event("exhibit_committed", 4, { interactionId: "alpinefit-cost-chain", stage: "act", selectedIds: ["raise-prices"] }),
    ]],
    ["alpinefit-brainstorming-v3", [
      event("brainstorm_committed", 1, { interactionId: "alpinefit-profit-drivers", selectedIdeaIds: ["other-logo"], placements: [{ ideaId: "other-logo", categoryId: "other-costs" }], priorityIdeaIds: ["other-logo"] }),
    ]],
    ["alpinefit-hypothesis-v3", [
      event("hypothesis_committed", 1, { interactionId: "alpinefit-hypothesis", stepId: "initial", status: "form", hypothesisId: "revenue-economics", evidenceIds: [], rationale: "Revenue may drive the decline." }),
      event("hypothesis_committed", 2, { interactionId: "alpinefit-hypothesis", stepId: "cost-growth", status: "retain", hypothesisId: "revenue-economics", evidenceIds: ["cost-growth"], rationale: "Retain for now." }),
      event("hypothesis_committed", 3, { interactionId: "alpinefit-hypothesis", stepId: "overtime-spike", status: "retain", hypothesisId: "revenue-economics", evidenceIds: ["overtime-spike"], rationale: "Still retain." }),
    ]],
  ])("retries %s without dropping its committed history", (activityId, committed) => {
    const definition = getActivityDefinition(activityId as string, 1)!;
    const state = replayActivityEvents(definition, [event("activity_started", 0), ...committed]);
    const retried = applyActivityEvent(definition, state, event("retry_decided", 80, {
      interactionId: definition.interaction.interactionId,
      decision: "retry",
    }));
    expect(retried.phase).toBe("interaction");
    expect(retried.events).toHaveLength(state.events.length + 1);
  });
});
