import { describe, expect, it } from "vitest";
import type { ActivityAttempt } from "./activity";
import { buildV3Progress, buildUnifiedHistory, V3_EVIDENCE_POLICY } from "./v3-progress";

export function attempt(day: number, options: Partial<ActivityAttempt> = {}): ActivityAttempt {
  return {
    attemptId: `attempt-${day}`, userId: "guest", activityId: "opening", contentVersion: 1,
    eventSchemaVersion: 3, scoringVersion: "v3", startedAt: `2026-09-0${day}T00:00:00.000Z`, completedAt: `2026-09-0${day}T00:01:00.000Z`,
    primarySkillId: "clarification", skillEvidence: [{ skillId: "clarification", source: "activity", contextId: "fitness", difficulty: "beginner", reviewed: true, retryOrTransfer: false, objectiveChecks: [], diagnosticCodes: [] }],
    diagnostics: [], events: [], courseContext: null, ...options,
  };
}
const blocker = { code: "objective_not_reframed", skillId: "clarification", source: "system", severity: "blocking" } as const;
const skill = (attempts: ActivityAttempt[]) => buildV3Progress(attempts, []).find(({ skillId }) => skillId === "clarification")!;

describe("reviewed evidence policy", () => {
  it("freezes its thresholds and starts without reviewed evidence", () => {
    expect(Object.isFrozen(V3_EVIDENCE_POLICY)).toBe(true);
    expect(skill([]).status).toBe("Not started");
    const unreviewed = attempt(1); unreviewed.skillEvidence[0].reviewed = false;
    expect(skill([unreviewed]).status).toBe("Not started");
  });
  it("develops until three attempts, retry/transfer, and breadth are present", () => {
    expect(skill([attempt(1)]).status).toBe("Developing");
    expect(skill([attempt(1), attempt(2), attempt(3)]).status).toBe("Developing");
    const transfer = attempt(3); transfer.skillEvidence[0].retryOrTransfer = true; transfer.skillEvidence[0].contextId = "restaurants";
    expect(skill([attempt(1), attempt(2), transfer]).status).toBe("Consistent");
    transfer.skillEvidence[0].contextId = "fitness"; transfer.skillEvidence[0].difficulty = "intermediate";
    expect(skill([attempt(1), attempt(2), transfer]).status).toBe("Consistent");
  });
  it("counts recurring blockers once per attempt in the latest three applicable attempts", () => {
    expect(skill([attempt(1, { diagnostics: [blocker] }), attempt(2, { diagnostics: [blocker] }), attempt(3)]).status).toBe("Needs practice");
    expect(skill([attempt(1, { diagnostics: [blocker, blocker] }), attempt(2), attempt(3)]).status).toBe("Developing");
    expect(skill([attempt(1, { diagnostics: [blocker] }), attempt(2, { diagnostics: [blocker] }), attempt(3), attempt(4), attempt(5)]).status).toBe("Developing");
  });
  it("uses the latest two objective checks, without treating absent checks as failures", () => {
    const failed = attempt(1); failed.skillEvidence[0].objectiveChecks = [{ id: "one", passed: false }, { id: "two", passed: false }];
    expect(skill([failed, attempt(2)]).status).toBe("Needs practice");
    const passed = attempt(3); passed.skillEvidence[0].objectiveChecks = [{ id: "three", passed: true }];
    expect(skill([failed, passed]).status).toBe("Developing");
  });
  it("labels diagnostic evidence and resolves earlier coaching after a later same-source strength", () => {
    const reflection = { ...blocker, source: "self_assessment" as const, severity: "coaching" as const };
    expect(skill([attempt(1, { diagnostics: [blocker, reflection] })]).diagnostics.map(d => d.sourceLabel)).toEqual(["Coach feedback", "Your reflection"]);
    const strong = { ...blocker, code: "strong_opening", severity: "strength" as const };
    expect(skill([attempt(1, { diagnostics: [blocker, reflection] }), attempt(2, { diagnostics: [strong] })]).diagnostics.map(d => d.sourceLabel)).toEqual(["Your reflection"]);
  });
  it("ignores older-version objects, deduplicates attempts, and counts full cases as transfer", () => {
    expect(skill([attempt(1, { scoringVersion: "v2" as "v3" })]).status).toBe("Not started");
    expect(skill([attempt(1), attempt(1)]).reviewed).toBe(1);
    const fullCase = { ...attempt(3), caseId: "case", eventSchemaVersion: 2 as const, scaffoldingLevel: null, caseMode: "practice" as const, skillScores: {}, feedbackCodes: [], events: [] };
    fullCase.skillEvidence[0].source = "case"; fullCase.skillEvidence[0].contextId = "case";
    expect(buildV3Progress([attempt(1), attempt(2)], [fullCase]).find(s => s.skillId === "clarification")?.status).toBe("Consistent");
  });
});

it("unifies exact activity and case links, deduplicates case skills, and retains unavailable history", () => {
  const old = { attemptId: "old", userId: "guest", attemptType: "case" as const, caseId: "lost", skillId: "structure" as const, score: 5, feedbackCodes: [], completedAt: "2026-09-01T00:00:00.000Z" };
  const rows = buildUnifiedHistory([old, { ...old, skillId: "synthesis" }], [attempt(2)], [], []);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ title: "Clarifying practice", href: "/practice/attempts/attempt-2", availability: "unavailable" });
  expect(rows[1]).toMatchObject({ title: "Case practice", href: "/cases/lost/attempts/old", availability: "unavailable" });
});
it("recognizes application in a different activity context as transfer without requiring a retry", () => {
  const transferred = attempt(3);
  transferred.activityId = "different-opening";
  transferred.skillEvidence[0].contextId = "different-opening";
  const result = skill([attempt(1), attempt(2), transferred]);
  expect(result.status).toBe("Consistent");
  expect(result.transferred).toBe(1);
});
it("preserves retired activity review links and separates reflection from objective strengths", () => {
  const rows = buildUnifiedHistory([], [attempt(1)], [], [{ kind: "activity", id: "opening", contentVersion: 1, title: "Earlier opening practice", status: "retired" }]);
  expect(rows[0]).toMatchObject({ title: "Earlier opening practice", availability: "retired", href: "/practice/attempts/attempt-1" });
  const reflectedStrength = { ...blocker, code: "strong_opening", source: "self_assessment" as const, severity: "strength" as const };
  expect(skill([attempt(1, { diagnostics: [blocker] }), attempt(2, { diagnostics: [reflectedStrength] })]).diagnostics[0]?.sourceLabel).toBe("Coach feedback");
});
it("uses persisted current full-case diagnostics when older case saves have no skill evidence", () => {
  const fullCase = { attemptId: "case", userId: "guest", caseId: "alpinefit-profitability", contentVersion: 2, eventSchemaVersion: 2 as const, scoringVersion: "v3" as const, scaffoldingLevel: "beginner" as const, caseMode: "practice" as const, completedAt: "2026-09-03T00:00:00Z", skillScores: { structure: 100 }, feedbackCodes: [], skillEvidence: [], diagnostics: [blocker], events: [], courseContext: null };
  const result = buildV3Progress([], [fullCase]);
  expect(result.find(s => s.skillId === "clarification")).toMatchObject({ status: "Developing", reviewed: 1, transferred: 1 });
  expect(result.find(s => s.skillId === "structure")?.status).toBe("Not started");
});
it("keeps a known case title when its exact historical content is unavailable", () => {
  const history = [{ attemptId: "old", userId: "guest", attemptType: "case" as const, caseId: "known", contentVersion: 99, skillId: "structure" as const, score: 0, feedbackCodes: [], completedAt: "2026-09-01T00:00:00Z" }];
  expect(buildUnifiedHistory(history, [], [], [{ kind: "case", id: "known", contentVersion: 2, title: "Known case", status: "active" }])[0]).toMatchObject({ title: "Known case", availability: "unavailable", href: "/cases/known/attempts/old" });
});
