import { expect, it } from "vitest";
import { activeActivityDefinitions } from "@/content/activities";
import type { ActivityAttempt } from "./activity";
import { buildV3Progress } from "./v3-progress";
import { selectV3Recommendation, type PracticeOption } from "./v3-recommendations";
const activities: PracticeOption[] = activeActivityDefinitions.map(a => ({ ...a, diagnosticCodes: a.feedback.paths.flatMap(p => p.diagnosticCodes) }));
function evidence(day: number, code = "objective_not_reframed", severity: "blocking" | "coaching" | "strength" = "blocking"): ActivityAttempt {
  return { attemptId: `a${day}`, userId: "guest", activityId: "alpinefit-clarifying-v3", contentVersion: 1, scoringVersion: "v3", eventSchemaVersion: 3, startedAt: `2026-09-0${day}T00:00:00.000Z`, completedAt: `2026-09-0${day}T00:01:00.000Z`, primarySkillId: "clarification", skillEvidence: [{ skillId: "clarification", source: "activity", contextId: "fitness", difficulty: "beginner", reviewed: true, retryOrTransfer: false, objectiveChecks: [], diagnosticCodes: [code] }], diagnostics: [{ code, skillId: "clarification", severity, source: "system" }], courseContext: null, events: [] };
}
const run = { title: "Saved practice", href: "/practice/activities/alpinefit-clarifying-v3?version=1", updatedAt: "2026-09-09T00:00:00.000Z" };
const course = { title: "Next course step", href: "/courses/profitability/steps/opening", explanation: "Your next required course step is opening." };
function choose(attempts: ActivityAttempt[] = [], extras = {}) {
  return selectV3Recommendation({ activities, attempts, skills: buildV3Progress(attempts, []), ...extras });
}
it("selects resume before course, blockers, and everything else", () => {
  expect(choose([evidence(1), evidence(2)], { runs: [run], courseStep: course })?.reason).toBe("resume");
});
it("selects the current course before recurring blockers", () => {
  expect(choose([evidence(1), evidence(2)], { courseStep: course })?.reason).toBe("course");
});
it("selects recurring blockers before newer coaching and rotates to another active context", () => {
  const result = choose([evidence(1), evidence(2), evidence(3, "constraint_missed", "coaching")]);
  expect(result?.reason).toBe("blocking");
  expect(result?.href).not.toContain("alpinefit-clarifying-v3");
  expect(result?.explanation).toContain("2 of your last 3");
});
it("selects newest unresolved coaching before missing transfer", () => {
  expect(choose([evidence(1, "constraint_missed", "coaching")])?.reason).toBe("coaching");
});
it("successful work resolves coaching and selects a different transfer activity", () => {
  const result = choose([evidence(1, "constraint_missed", "coaching"), evidence(2, "strong_opening", "strength")]);
  expect(result?.reason).toBe("transfer");
  expect(result?.href).not.toContain("alpinefit-clarifying-v3");
});
it("offers the shortest unpracticed active lab when no other priority applies", () => {
  const result = choose();
  expect(result?.reason).toBe("unpracticed");
  expect(result?.estimatedMinutes).toBe(Math.min(...activities.map(a => a.estimatedMinutes)));
});
it("skips retired and missing options and ties by recency, severity, time, then id", () => {
  const retired = activities.map(a => ({ ...a, status: "retired" as const }));
  expect(choose([evidence(1)], { activities: retired })).toBeNull();
  const sameSkill = activities.filter(a => a.primarySkillId === "clarification").map(a => ({ ...a, estimatedMinutes: a.id.startsWith("paypilot") ? 1 : 5 }));
  expect(choose([evidence(1)], { activities: sameSkill })?.href).toContain("paypilot");
  const latest = evidence(2, "comparison_missed", "coaching"); latest.primarySkillId = "exhibit"; latest.skillEvidence[0].skillId = "exhibit"; latest.diagnostics[0].skillId = "exhibit";
  expect(choose([evidence(1), latest])?.explanation).toContain("comparison");
});

import { findRecoverableRuns } from "./v3-recommendations";
it("offers only exact locally recoverable unfinished runs, keeping case mode and ignoring damaged storage", () => {
  const resources = [{ kind: "activity" as const, ...activities[0] }, { kind: "case" as const, id: "alpinefit-profitability", title: "AlpineFit profitability", contentVersion: 2, status: "active" as const }];
  const key = `casework:v3-activity:${activities[0].id}:1`;
  const stored = { attemptId: "run", startedAt: "2026-09-01T00:00:00.000Z", events: [{ type: "activity_started", eventId: "e1", atMs: 0 }] };
  expect(findRecoverableRuns([[key, JSON.stringify(stored)]], resources)[0]?.href).toContain("?version=1");
  expect(findRecoverableRuns([[key, JSON.stringify({ ...stored, completedAt: "2026-09-02T00:00:00.000Z" })]], resources)).toEqual([]);
  expect(findRecoverableRuns([[key, "invalid"], [key + "99", JSON.stringify(stored)]], resources)).toEqual([]);
  expect(findRecoverableRuns([[key, JSON.stringify({ ...stored, events: [{ type: "unknown" }] })]], resources)).toEqual([]);
  expect(findRecoverableRuns([["casework:guest-session:alpinefit-profitability:interview", JSON.stringify({ contentVersion: 2, runStartedAtMs: 1, events: [], clarificationDraftIds: ["objective"] })]], resources)[0]?.href).toBe("/cases/alpinefit-profitability?version=2&mode=interview");
  expect(findRecoverableRuns([["casework:guest-session:alpinefit-profitability:cycle:opening", "{}"]], resources)).toEqual([]);
});
it("uses lower practice time to break equal-recency, equal-severity diagnostic ties", () => {
  const first = evidence(1, "low_value_question", "coaching");
  const second = evidence(1, "next_test_missing", "coaching"); second.attemptId = "other"; second.primarySkillId = "exhibit"; second.skillEvidence[0].skillId = "exhibit"; second.diagnostics[0].skillId = "exhibit";
  const options = activities.map(a => ({ ...a, estimatedMinutes: a.primarySkillId === "exhibit" ? 1 : 10 }));
  expect(choose([first, second], { activities: options })?.estimatedMinutes).toBe(1);
});
