import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("V3 activity commit", () => {
  it("reveals authored feedback only after a legal commitment", async () => {
    const events = [{ eventId: "start", type: "activity_started", atMs: 0 }];
    const response = await POST(new Request("http://localhost/api/activities/v3-private-test/commit", {
      method: "POST",
      body: JSON.stringify({
        contentVersion: 1,
        events,
        event: {
          eventId: "choice",
          type: "selection_committed",
          interactionId: "private-choice",
          selectedIds: ["history"],
          atMs: 1,
        },
      }),
    }), { params: Promise.resolve({ activityId: "v3-private-test" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      phase: "feedback",
      feedback: { classification: "premature" },
    });
  });

  it("rejects partial course context", async () => {
    const response = await POST(new Request("http://localhost/api/activities/v3-private-test/commit", {
      method: "POST",
      body: JSON.stringify({
        contentVersion: 1,
        events: [],
        event: { eventId: "start", type: "activity_started", atMs: 0 },
        courseContext: { courseId: "profitability-v3" },
      }),
    }), { params: Promise.resolve({ activityId: "v3-private-test" }) });
    expect(response.status).toBe(400);
  });
});
