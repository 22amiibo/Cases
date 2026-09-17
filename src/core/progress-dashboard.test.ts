import { describe, expect, it } from "vitest";
import type {
  CommittedResponse,
  DiagnosticOutcome,
  V2SkillId,
} from "./schema";
import type { SkillAttempt } from "@/data/repository";
import {
  buildProgressDashboard,
  buildRecommendedSession,
  calculateV2EvidenceStatus,
  skillReadiness,
} from "./progress-dashboard";

function legacyAttempt(
  attemptId: string,
  skillId: SkillAttempt["skillId"],
  score: number,
  day: number,
  feedbackCodes: string[] = [],
): SkillAttempt {
  return {
    attemptId,
    attemptType: attemptId.startsWith("case") ? "case" : "drill",
    userId: "guest",
    skillId,
    score,
    feedbackCodes,
    completedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
    scoringVersion: "v1",
  };
}

function v2Attempt({
  attemptId,
  skillId = "structure",
  day,
  revised = false,
  transferred = false,
  diagnostics = [],
}: {
  attemptId: string;
  skillId?: V2SkillId;
  day: number;
  revised?: boolean;
  transferred?: boolean;
  diagnostics?: DiagnosticOutcome[];
}): SkillAttempt {
  const responses: CommittedResponse[] = [{
    responseId: `${attemptId}-r1`,
    interactionId: attemptId,
    revision: 1,
    revisionOf: null,
    responseKind: skillId,
    text: "First committed response",
    committedAtMs: 1,
  }];
  if (revised) {
    responses.push({
      responseId: `${attemptId}-r2`,
      interactionId: attemptId,
      revision: 2,
      revisionOf: `${attemptId}-r1`,
      responseKind: skillId,
      text: "Revised committed response",
      committedAtMs: 2,
    });
  }
  return {
    attemptId,
    attemptType: transferred ? "case" : "drill",
    userId: "guest",
    skillId,
    score: 0,
    feedbackCodes: [],
    completedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
    scoringVersion: "v2",
    contentVersion: 2,
    eventSchemaVersion: 2,
    scaffoldingLevel: "beginner",
    diagnostics,
    learningEvidence: {
      interactionId: attemptId,
      skillId,
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel: "beginner",
      responses,
      rubricOutcomes: [{ criterionId: "reviewed", met: true }],
      diagnostics,
    },
  };
}

describe("legacy readiness", () => {
  it.each([
    [40, "Needs work"],
    [50, "Developing"],
    [70, "Proficient"],
    [85, "Strong"],
    [null, "Not assessed"],
  ] as const)("maps %s to %s without claiming interview readiness", (score, label) => {
    expect(skillReadiness(score)).toBe(label);
  });
});

describe("V2 evidence status", () => {
  it("moves from Not started to Building to Consistent using the configured evidence rule", () => {
    expect(calculateV2EvidenceStatus([])).toBe("Not started");
    expect(
      calculateV2EvidenceStatus([
        v2Attempt({ attemptId: "one", day: 1 }),
      ]),
    ).toBe("Building");
    expect(
      calculateV2EvidenceStatus([
        v2Attempt({ attemptId: "one", day: 1 }),
        v2Attempt({ attemptId: "two", day: 2, revised: true }),
        v2Attempt({ attemptId: "three", day: 3 }),
      ]),
    ).toBe("Consistent");
  });

  it("stays Building when one blocking diagnostic recurs in all three recent reviews", () => {
    const blocking: DiagnosticOutcome = {
      code: "missing_major_branch",
      source: "system",
      severity: "blocking",
    };
    expect(
      calculateV2EvidenceStatus([
        v2Attempt({ attemptId: "one", day: 1, diagnostics: [blocking] }),
        v2Attempt({ attemptId: "two", day: 2, revised: true, diagnostics: [blocking] }),
        v2Attempt({ attemptId: "three", day: 3, diagnostics: [blocking] }),
      ]),
    ).toBe("Building");
  });
});

describe("buildProgressDashboard", () => {
  it("keeps V1 numeric history in a separate legacy section", () => {
    const history = [
      legacyAttempt("drill-1", "quantitative", 100, 1, ["correct_calculation"]),
      legacyAttempt("case-1", "structure", 60, 2, ["strong_synthesis"]),
      v2Attempt({ attemptId: "v2-one", day: 3, skillId: "clarification" }),
    ];
    const dashboard = buildProgressDashboard(history);

    expect(dashboard.legacy.sessionsCompleted).toBe(2);
    expect(dashboard.v2.sessionsCompleted).toBe(1);
    expect(dashboard.legacy.skills.find((skill) => skill.skillId === "quantitative"))
      .toMatchObject({ score: 100, trend: [100] });
    expect(dashboard.v2.skills.find((skill) => skill.skillId === "clarification"))
      .toMatchObject({ status: "Building", evidence: { reviewed: 1 } });
  });

  it("does not let extreme V1 scores change any V2 status or diagnostics", () => {
    const v2 = [v2Attempt({ attemptId: "v2-one", day: 3 })];
    const before = buildProgressDashboard(v2).v2;
    const after = buildProgressDashboard([
      ...v2,
      ...Array.from({ length: 20 }, (_, index) =>
        legacyAttempt(`legacy-${index}`, "structure", index % 2 ? 0 : 100, index + 4),
      ),
    ]).v2;
    expect(after).toEqual(before);
  });

  it("identifies self-assessed diagnostic evidence by source", () => {
    const diagnostic: DiagnosticOutcome = {
      code: "objective_not_reframed",
      source: "self_assessment",
      severity: "coaching",
    };
    const skill = buildProgressDashboard([
      v2Attempt({ attemptId: "v2-one", day: 1, diagnostics: [diagnostic] }),
    ]).v2.skills.find((item) => item.skillId === "structure");
    expect(skill?.diagnostics).toEqual([{ diagnostic, count: 1 }]);
  });
});

describe("buildRecommendedSession", () => {
  it("is unchanged by V1 scores and defaults to the V2 diagnostic mix", () => {
    const empty = buildRecommendedSession([]);
    const legacy = buildRecommendedSession([
      legacyAttempt("legacy-1", "structure", 0, 1),
      legacyAttempt("legacy-2", "quantitative", 100, 2),
    ]);
    expect(legacy).toEqual(empty);
    expect(empty).toMatchObject({
      title: "V2 diagnostic mix",
      skillId: "clarification",
      drillHref: "/drills/clarification",
    });
  });
});
