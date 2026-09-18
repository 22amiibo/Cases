import { describe, expect, it } from "vitest";
import { getActivityDefinition } from "@/content/activities";
import { ActivityEventSchema, replayActivityEvents } from "./activity";
import { buildActivityReview } from "./activity-review";

const event = (type: string, atMs: number, values: Record<string, unknown> = {}) =>
  ActivityEventSchema.parse({ eventId: `event-${atMs}`, type, atMs, ...values });

describe("activity review", () => {
  it("scores each Exhibit stage and translates committed choices into reasoning steps", () => {
    const definition = getActivityDefinition("alpinefit-exhibit-v3", 1)!;
    const events = [
      event("activity_started", 0),
      event("exhibit_committed", 1, { interactionId: "alpinefit-cost-chain", stage: "observe", selectedIds: ["labor-outlier"] }),
      event("exhibit_committed", 2, { interactionId: "alpinefit-cost-chain", stage: "prioritize", selectedIds: ["labor-priority"] }),
      event("exhibit_committed", 3, { interactionId: "alpinefit-cost-chain", stage: "interpret", selectedIds: ["margin-pressure"] }),
      event("exhibit_committed", 4, { interactionId: "alpinefit-cost-chain", stage: "act", selectedIds: ["broad-cost-review"] }),
      event("retry_decided", 5, { interactionId: "alpinefit-cost-chain", decision: "continue" }),
      event("takeaway_viewed", 6),
      event("activity_completed", 7),
    ];

    const review = buildActivityReview(definition, replayActivityEvents(definition, events));

    expect(review.performance).toEqual({ earned: 3, total: 4, label: "3 of 4 stages" });
    expect(review.steps).toMatchObject([
      { label: "Observation", assessment: "Strong" },
      { label: "Priority", assessment: "Strong" },
      { label: "Implication", assessment: "Strong" },
      { label: "Next action", assessment: "Needs another look" },
    ]);
    expect(review.improvements[0]).toContain("Break labor down by club and driver");
  });
});
