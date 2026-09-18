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
  caseDiagnostics = [],
  scaffoldingLevel = "beginner",
}: {
  attemptId: string;
  skillId?: V2SkillId;
  day: number;
  revised?: boolean;
  transferred?: boolean;
  diagnostics?: DiagnosticOutcome[];
  caseDiagnostics?: DiagnosticOutcome[];
  scaffoldingLevel?: "beginner" | "intermediate" | "interview";
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
    scaffoldingLevel,
    diagnostics,
    caseDiagnostics,
    learningEvidence: {
      interactionId: attemptId,
      skillId,
      scoringVersion: "v2",
      contentVersion: 2,
      eventSchemaVersion: 2,
      scaffoldingLevel,
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
    expect(skill?.diagnostics).toEqual([expect.objectContaining({
      code: "objective_not_reframed",
      source: "self_assessment",
      count: 1,
      skillId: "structure",
      scaffoldingLevels: ["beginner"],
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    })]);
  });

  it("counts case-level hypothesis diagnostics once without creating a scored skill", () => {
    const diagnostic: DiagnosticOutcome = {
      code: "strong_hypothesis_update",
      source: "system",
      severity: "strength",
      responseId: "hypothesis-2",
    };
    const structure = v2Attempt({
      attemptId: "case-1",
      day: 1,
      transferred: true,
      caseDiagnostics: [diagnostic],
    });
    const synthesis = {
      ...structure,
      skillId: "synthesis" as const,
      learningEvidence: null,
      diagnostics: [],
    };

    const dashboard = buildProgressDashboard([structure, synthesis]);

    expect(dashboard.v2.hypothesis).toEqual({
      casesReviewed: 1,
      diagnostics: [expect.objectContaining({
        code: diagnostic.code,
        source: diagnostic.source,
        count: 1,
      })],
    });
    expect(dashboard.v2.skills).toHaveLength(6);
    expect(dashboard.v2.skills.map(({ skillId }) => skillId)).not.toContain(
      "hypothesis",
    );
    expect(
      dashboard.v2.skills.flatMap(({ diagnostics }) => diagnostics),
    ).not.toContainEqual(expect.objectContaining({ code: diagnostic.code }));
  });

  it("aggregates V2 diagnostics by code, source, recency, skill, and scaffolding", () => {
    const system: DiagnosticOutcome = {
      code: "missing_major_branch",
      source: "system",
      severity: "blocking",
    };
    const selfAssessed = { ...system, source: "self_assessment" as const };
    const dashboard = buildProgressDashboard([
      v2Attempt({ attemptId: "old", day: 1, diagnostics: [system] }),
      v2Attempt({
        attemptId: "new",
        day: 3,
        diagnostics: [system, selfAssessed],
        scaffoldingLevel: "intermediate",
      }),
      legacyAttempt("legacy", "structure", 0, 4, ["missing_major_branch"]),
    ]);

    const diagnostics = dashboard.v2.skills.find(
      ({ skillId }) => skillId === "structure",
    )?.diagnostics;
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "missing_major_branch",
        source: "system",
        count: 2,
        firstSeenAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-03T00:00:00.000Z",
        skillId: "structure",
        scaffoldingLevels: ["beginner", "intermediate"],
      }),
      expect.objectContaining({
        code: "missing_major_branch",
        source: "self_assessment",
        count: 1,
      }),
    ]);
  });

  it("counts reduced-scaffolding V2 evidence without relabeling V1 history", () => {
    const skill = buildProgressDashboard([
      legacyAttempt("legacy", "structure", 100, 1),
      v2Attempt({ attemptId: "guided", day: 2 }),
      v2Attempt({
        attemptId: "transfer",
        day: 3,
        transferred: true,
        scaffoldingLevel: "interview",
      }),
    ]).v2.skills.find(({ skillId }) => skillId === "structure");

    expect(skill?.evidence).toMatchObject({
      reducedScaffolding: 1,
      scaffolding: { beginner: 1, intermediate: 0, interview: 1 },
    });
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
      diagnosis: null,
      practice: {
        kind: "drill",
        id: "alpinefit-opening-clarification",
        contentVersion: 2,
        href: "/drills/clarification?rep=alpinefit-opening-clarification&version=2",
      },
    });
  });

  it("selects a recurring objective blocking diagnosis and an exact versioned rep", () => {
    const blocking: DiagnosticOutcome = {
      code: "missing_major_branch",
      source: "system",
      severity: "blocking",
    };
    const recommendation = buildRecommendedSession([
      v2Attempt({ attemptId: "one", day: 1, diagnostics: [blocking] }),
      v2Attempt({ attemptId: "two", day: 2, diagnostics: [blocking] }),
      v2Attempt({
        attemptId: "self",
        day: 3,
        skillId: "prioritization",
        diagnostics: [{
          code: "low_information_value",
          source: "self_assessment",
          severity: "blocking",
        }],
      }),
    ]);

    expect(recommendation).toMatchObject({
      title: "Missing major branch",
      skillId: "structure",
      diagnosis: {
        code: "missing_major_branch",
        source: "system",
        count: 2,
      },
      practice: {
        kind: "drill",
        id: "quickcart-structure-v2",
        contentVersion: 2,
        href: "/drills/structure?rep=quickcart-structure-v2&version=2",
      },
    });
  });

  it("rotates after a successful retry and never considers V1 diagnostics", () => {
    const missingBranch: DiagnosticOutcome = {
      code: "missing_major_branch",
      source: "system",
      severity: "blocking",
    };
    const setup: DiagnosticOutcome = {
      code: "setup_error",
      source: "system",
      severity: "blocking",
    };
    const recommendation = buildRecommendedSession([
      v2Attempt({ attemptId: "branch-1", day: 1, diagnostics: [missingBranch] }),
      v2Attempt({ attemptId: "branch-2", day: 2, diagnostics: [missingBranch] }),
      v2Attempt({ attemptId: "math-1", day: 3, skillId: "quantitative", diagnostics: [setup] }),
      v2Attempt({ attemptId: "math-2", day: 4, skillId: "quantitative", diagnostics: [setup] }),
      v2Attempt({ attemptId: "branch-success", day: 5, revised: true }),
      {
        ...legacyAttempt("legacy", "synthesis", 0, 6),
        diagnostics: [{
          code: "answer_not_first",
          source: "system",
          severity: "blocking",
        }],
      },
    ]);

    expect(recommendation.diagnosis?.code).toBe("setup_error");
    expect(recommendation.practice).toMatchObject({
      id: "harborcart-quantitative-v2",
      contentVersion: 2,
    });
  });

  it("targets the lower-scaffolding pilot case for recurring hypothesis findings", () => {
    const diagnostic: DiagnosticOutcome = {
      code: "contradicted_hypothesis_retained",
      source: "system",
      severity: "coaching",
    };
    const recommendation = buildRecommendedSession([
      v2Attempt({
        attemptId: "case-1",
        day: 1,
        transferred: true,
        scaffoldingLevel: "interview",
        caseDiagnostics: [diagnostic],
      }),
      v2Attempt({
        attemptId: "case-2",
        day: 2,
        transferred: true,
        scaffoldingLevel: "interview",
        caseDiagnostics: [diagnostic],
      }),
    ]);

    expect(recommendation).toMatchObject({
      diagnosis: { code: "contradicted_hypothesis_retained" },
      practice: {
        kind: "case",
        id: "goldenloaf-operations",
        contentVersion: 2,
        href: "/cases/goldenloaf-operations?version=2",
      },
    });
  });
});
