import { describe, expect, it } from "vitest";
import { POST } from "./route";

const events = [
  { eventId: "start", type: "activity_started", atMs: 0 },
  {
    eventId: "choice",
    type: "selection_committed",
    interactionId: "private-choice",
    selectedIds: ["objective"],
    atMs: 1,
  },
  {
    eventId: "continue",
    type: "retry_decided",
    interactionId: "private-choice",
    decision: "continue",
    atMs: 2,
  },
  { eventId: "takeaway", type: "takeaway_viewed", atMs: 3 },
  { eventId: "complete", type: "activity_completed", atMs: 4 },
];

async function complete() {
  return POST(new Request("http://localhost/api/activities/v3-private-test/complete", {
    method: "POST",
    body: JSON.stringify({ contentVersion: 1, events, courseContext: null }),
  }), { params: Promise.resolve({ activityId: "v3-private-test" }) });
}

describe("V3 activity completion", () => {
  it("returns the same deterministic completion for an identical retry", async () => {
    const first = await complete();
    const second = await complete();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
  });

  it("rejects incomplete event history", async () => {
    const response = await POST(new Request("http://localhost/api/activities/v3-private-test/complete", {
      method: "POST",
      body: JSON.stringify({ contentVersion: 1, events: events.slice(0, 2) }),
    }), { params: Promise.resolve({ activityId: "v3-private-test" }) });
    expect(response.status).toBe(400);
  });
});
