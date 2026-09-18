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
