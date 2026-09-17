import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("case session projection", () => {
  it("stops safely when an unknown historical content version is requested", async () => {
    const response = await POST(
      new Request("http://localhost/api/cases/alpinefit-profitability/session", {
        method: "POST",
        body: JSON.stringify({ events: [], contentVersion: 99 }),
      }),
      { params: Promise.resolve({ caseId: "alpinefit-profitability" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Case version not found",
    });
  });

  it("rejects malformed request JSON without throwing", async () => {
    const response = await POST(
      new Request("http://localhost/api/cases/alpinefit-profitability/session", {
        method: "POST",
        body: "{",
      }),
      { params: Promise.resolve({ caseId: "alpinefit-profitability" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid event history",
    });
  });

  it("does not expose replay data for a forged early completion", async () => {
    const response = await POST(
      new Request("http://localhost/api/cases/alpinefit-profitability/session", {
        method: "POST",
        body: JSON.stringify({
          events: [
            {
              type: "recommendation_submitted",
              decisionId: "stabilize-staffing",
              evidenceIds: ["turnover-link"],
              riskId: "retention-cost",
              nextStepId: "six-club-pilot",
              atMs: 1,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ caseId: "alpinefit-profitability" }) },
    );
    const view = await response.json();

    expect(response.status).toBe(200);
    expect(view.currentStage).toBe("clarify");
    expect(view.review).toBeNull();
    expect(JSON.stringify(view)).not.toContain("critical-found");
    expect(JSON.stringify(view)).not.toContain("Example efficient path");
  });
});
