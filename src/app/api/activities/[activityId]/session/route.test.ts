import { describe, expect, it } from "vitest";
import { POST } from "./route";

function request(body: unknown) {
  return POST(new Request("http://localhost/api/activities/v3-private-test/session", {
    method: "POST",
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ activityId: "v3-private-test" }) });
}

describe("V3 activity session", () => {
  it("loads an exact learner-safe activity version", async () => {
    const response = await request({ contentVersion: 1, events: [] });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: "v3-private-test",
      contentVersion: 1,
      phase: "context",
    });
    expect(JSON.stringify(payload)).not.toContain("Clarify the decision first.");
    expect(JSON.stringify(payload)).not.toContain("low_value_question");
  });

  it("fails safely for an unknown version", async () => {
    const response = await request({ contentVersion: 99, events: [] });
    expect(response.status).toBe(404);
  });
});

it("rejects complete but mismatched exact course context before restoring events", async () => {
  const response = await POST(new Request("http://localhost/session", { method: "POST", body: JSON.stringify({ contentVersion: 1, events: [], courseContext: { courseId: "profitability-v3", courseVersion: 1, courseStepId: "clarifying" } }) }), { params: Promise.resolve({ activityId: "v3-private-test" }) });
  expect(response.status).toBe(400);
});
