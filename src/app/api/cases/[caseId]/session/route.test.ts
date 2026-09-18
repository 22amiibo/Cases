import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  revealLearningCycleAfterCommit,
  type AuthoredLearningCycle,
} from "@/core/learning-cycle";
import type { CaseEvent } from "@/core/schema";
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

  it("keeps initial and update hypothesis choices out of session payloads", async () => {
    const definition = getCaseDefinition("alpinefit-profitability", 2)!;
    const completedCycle = (authored: AuthoredLearningCycle, responseId: string) => {
      const response = {
        responseId,
        interactionId: authored.interactionId,
        revision: 1,
        revisionOf: null,
        responseKind: authored.responseKind,
        text: "A committed response with testable reasoning.",
        committedAtMs: 1,
      };
      let cycle = createLearningCycleState(authored.interactionId);
      cycle = applyLearningCycleAction(cycle, {
        type: "response_committed",
        response,
        reveal: revealLearningCycleAfterCommit(authored, response),
      });
      cycle = applyLearningCycleAction(cycle, {
        type: "self_check_submitted",
        outcomes: authored.criteria.map(({ id }) => ({ criterionId: id, met: true })),
      });
      cycle = applyLearningCycleAction(cycle, { type: "comparison_viewed" });
      return applyLearningCycleAction(cycle, { type: "cycle_completed" });
    };
    const openingCycle = completedCycle(definition.opening!.responseCycle, "opening-response");
    const initialCycle = completedCycle(definition.hypothesisPractice!.initial, "hypothesis-response");
    const initialResponse = initialCycle.responses[0];
    const initialEvents: CaseEvent[] = [
      {
        type: "case_opening_submitted",
        eventSchemaVersion: 2,
        responses: openingCycle.responses,
        rubricOutcomes: openingCycle.assessments[0].outcomes,
        diagnostics: [{
          code: "strong_opening",
          source: "system",
          severity: "strength",
          responseId: openingCycle.responses[0].responseId,
        }],
        questions: definition.clarificationOptions.slice(0, 3).map(({ id, response }) => ({
          questionId: id,
          interviewerResponse: response,
        })),
        authoredComparisonViewed: true,
        atMs: 1,
      },
      {
        type: "framework_submitted",
        eventSchemaVersion: 2,
        branches: [{ conceptId: "revenue", children: [] }],
        priorityConceptId: "revenue",
        rationale: "Test revenue first.",
        atMs: 2,
      },
    ];
    const request = (events: CaseEvent[]) => POST(
      new Request("http://localhost/api/cases/alpinefit-profitability/session", {
        method: "POST",
        body: JSON.stringify({ events, contentVersion: 2 }),
      }),
      { params: Promise.resolve({ caseId: definition.id }) },
    );

    const initial = await request(initialEvents);
    const initialPayload = await initial.json();
    expect(initial.status).toBe(200);
    expect(initialPayload.hypothesis.phase).toBe("initial");
    expect(initialPayload.hypothesis).not.toHaveProperty("options");

    const updateEvents: CaseEvent[] = [
      ...initialEvents,
      {
        type: "hypothesis_formed",
        eventSchemaVersion: 2,
        hypothesisId: "revenue-economics",
        evidenceIds: [],
        revisionOfResponseId: null,
        responses: initialCycle.responses,
        rubricOutcomes: initialCycle.assessments[0].outcomes,
        diagnostics: initialCycle.diagnostics,
        rationale: initialResponse.text,
        authoredComparisonViewed: true,
        atMs: 3,
      },
      { type: "node_investigated", nodeId: "costs", atMs: 4 },
    ];
    const update = await request(updateEvents);
    const updatePayload = await update.json();
    expect(update.status).toBe(200);
    expect(updatePayload.hypothesis.phase).toBe("update");
    expect(updatePayload.hypothesis).not.toHaveProperty("options");

    const serialized = JSON.stringify([initialPayload, updatePayload]);
    for (const option of definition.hypothesisPractice!.options) {
      expect(serialized).not.toContain(option.label);
    }
  });
});
