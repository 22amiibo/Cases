import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { inactiveCaseIds } = vi.hoisted(() => ({
  inactiveCaseIds: new Set<string>(),
}));

vi.mock("@/content/cases", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/content/cases")>();
  return {
    ...actual,
    getCaseDefinition(caseId: string, contentVersion?: number) {
      if (contentVersion === undefined && inactiveCaseIds.has(caseId)) {
        return undefined;
      }
      return actual.getCaseDefinition(caseId, contentVersion);
    },
  };
});

describe("case session projection", () => {
  beforeEach(() => inactiveCaseIds.clear());

  it("replays an exact retained version when the case is no longer active", async () => {
    inactiveCaseIds.add("northstar-profitability");

    const response = await POST(
      new Request("http://localhost/api/cases/northstar-profitability/session", {
        method: "POST",
        body: JSON.stringify({ events: [], contentVersion: 1 }),
      }),
      { params: Promise.resolve({ caseId: "northstar-profitability" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      currentStage: "clarify",
      review: null,
    });
  });

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

  it("rejects a forged early completion instead of replaying a partial history", async () => {
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
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid event history",
    });
  });
});
