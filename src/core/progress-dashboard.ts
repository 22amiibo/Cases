import type { DiagnosticOutcome, V2SkillId } from "./schema";
import {
  selectV2SkillHistory,
  type SkillAttempt,
} from "@/data/repository";
import {
  diagnosticDefinitions,
  type DiagnosticCode,
  type DiagnosticArea,
} from "./diagnostics";
import { calculateRollingSkillScore } from "./progress";

export const LEGACY_TRAINABLE_SKILLS = [
  "structure",
  "prioritization",
  "quantitative",
  "exhibit",
  "synthesis",
] as const;

export const V2_TRAINABLE_SKILLS = [
  "clarification",
  ...LEGACY_TRAINABLE_SKILLS,
] as const satisfies readonly V2SkillId[];

export const TRAINABLE_SKILLS = V2_TRAINABLE_SKILLS;
export type TrainableSkillId = (typeof V2_TRAINABLE_SKILLS)[number];
export type V2EvidenceStatus = "Not started" | "Building" | "Consistent";
export type LegacyReadiness =
  | "Not assessed"
  | "Needs work"
  | "Developing"
  | "Proficient"
  | "Strong";

export const SKILL_LABELS: Record<TrainableSkillId, string> = {
  clarification: "Case opening & clarification",
  structure: "Structuring",
  prioritization: "Prioritization",
  quantitative: "Quantitative reasoning",
  exhibit: "Exhibit interpretation",
  synthesis: "Synthesis",
};

export type ConsistencyRule = {
  minimumReviewedAttempts: number;
  recentDiagnosticWindow: number;
  requireRevisionOrTransfer: boolean;
};

export const DEFAULT_CONSISTENCY_RULE: ConsistencyRule = Object.freeze({
  minimumReviewedAttempts: 3,
  recentDiagnosticWindow: 3,
  requireRevisionOrTransfer: true,
});

export function skillReadiness(score: number | null): LegacyReadiness {
  if (score === null) return "Not assessed";
  if (score < 50) return "Needs work";
  if (score < 70) return "Developing";
  if (score < 85) return "Proficient";
  return "Strong";
}

function oldestFirst(attempts: SkillAttempt[]) {
  return [...attempts].sort(
    (left, right) =>
      new Date(left.completedAt).getTime() -
      new Date(right.completedAt).getTime(),
  );
}

function uniqueSessions(history: SkillAttempt[]) {
  return new Set(
    history.map((attempt) => `${attempt.attemptType}:${attempt.attemptId}`),
  ).size;
}

function commonFeedback(attempts: SkillAttempt[]) {
  const counts = new Map<string, number>();
  for (const code of attempts.flatMap((attempt) => attempt.feedbackCodes)) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([code]) => code);
}

function isReviewed(attempt: SkillAttempt) {
  const evidence = attempt.learningEvidence;
  return Boolean(
    evidence?.scoringVersion === "v2" &&
      (evidence.rubricOutcomes.length > 0 || evidence.diagnostics.length > 0),
  );
}

function isCommitted(attempt: SkillAttempt) {
  const evidence = attempt.learningEvidence;
  return evidence?.scoringVersion === "v2" && evidence.responses.length > 0;
}

function isRevised(attempt: SkillAttempt) {
  const evidence = attempt.learningEvidence;
  return (
    evidence?.scoringVersion === "v2" && evidence.responses.length > 1
  );
}

function recurringBlockingDiagnostic(
  attempts: SkillAttempt[],
  windowSize: number,
) {
  const recent = oldestFirst(attempts).slice(-windowSize);
  if (recent.length < windowSize) return false;
  const firstCodes = new Set(
    (recent[0].diagnostics ?? [])
      .filter((diagnostic) => diagnostic.severity === "blocking")
      .map((diagnostic) => diagnostic.code),
  );
  return [...firstCodes].some((code) =>
    recent.every((attempt) =>
      (attempt.diagnostics ?? []).some(
        (diagnostic) =>
          diagnostic.code === code && diagnostic.severity === "blocking",
      ),
    ),
  );
}

export function calculateV2EvidenceStatus(
  attempts: SkillAttempt[],
  rule: ConsistencyRule = DEFAULT_CONSISTENCY_RULE,
): V2EvidenceStatus {
  if (attempts.length === 0) return "Not started";
  const reviewed = attempts.filter(isReviewed);
  if (reviewed.length < rule.minimumReviewedAttempts) return "Building";
  if (
    rule.requireRevisionOrTransfer &&
    !reviewed.some(
      (attempt) => isRevised(attempt) || attempt.attemptType === "case",
    )
  ) {
    return "Building";
  }
  return recurringBlockingDiagnostic(reviewed, rule.recentDiagnosticWindow)
    ? "Building"
    : "Consistent";
}

type DiagnosticObservation = {
  diagnostic: DiagnosticOutcome;
  completedAt: string;
  skillId: string;
  scaffoldingLevel: "beginner" | "intermediate" | "interview";
  scope: "skill" | "case";
};

function summarizeDiagnostics(observations: DiagnosticObservation[]) {
  const counts = new Map<string, {
    code: DiagnosticCode;
    source: DiagnosticOutcome["source"];
    severity: DiagnosticOutcome["severity"];
    count: number;
    firstSeenAt: string;
    lastSeenAt: string;
    skillId: string;
    scaffoldingLevels: Array<DiagnosticObservation["scaffoldingLevel"]>;
    latestScaffoldingLevel: DiagnosticObservation["scaffoldingLevel"];
    scope: DiagnosticObservation["scope"];
  }>();
  for (const observation of observations) {
    const { diagnostic } = observation;
    const key = `${observation.scope}:${observation.skillId}:${diagnostic.source}:${diagnostic.code}`;
    const prior = counts.get(key);
    const dates = prior
      ? [prior.firstSeenAt, prior.lastSeenAt, observation.completedAt].sort()
      : [observation.completedAt];
    counts.set(key, {
      code: diagnostic.code,
      source: diagnostic.source,
      severity: diagnostic.severity,
      count: (prior?.count ?? 0) + 1,
      firstSeenAt: dates[0],
      lastSeenAt: dates.at(-1)!,
      skillId: observation.skillId,
      scaffoldingLevels: [...new Set([
        ...(prior?.scaffoldingLevels ?? []),
        observation.scaffoldingLevel,
      ])],
      latestScaffoldingLevel:
        !prior || observation.completedAt >= prior.lastSeenAt
          ? observation.scaffoldingLevel
          : prior.latestScaffoldingLevel,
      scope: observation.scope,
    });
  }
  return [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.lastSeenAt.localeCompare(left.lastSeenAt) ||
      left.code.localeCompare(right.code),
  );
}

function diagnosticSummary(attempts: SkillAttempt[]) {
  return summarizeDiagnostics(
    attempts.flatMap((attempt) =>
      (attempt.diagnostics ?? []).flatMap((diagnostic) =>
        attempt.scaffoldingLevel
          ? [{
              diagnostic,
              completedAt: attempt.completedAt,
              skillId: attempt.skillId,
              scaffoldingLevel: attempt.scaffoldingLevel,
              scope: "skill",
            }]
          : [],
      ),
    ),
  );
}

function hypothesisDiagnosticSummary(attempts: SkillAttempt[]) {
  const seenCaseAttempts = new Set<string>();
  let casesReviewed = 0;
  const diagnostics = attempts.flatMap((attempt): DiagnosticObservation[] => {
    if (
      attempt.attemptType !== "case" ||
      seenCaseAttempts.has(attempt.attemptId)
    ) {
      return [];
    }
    seenCaseAttempts.add(attempt.attemptId);
    const hypothesisDiagnostics = (attempt.caseDiagnostics ?? []).filter(
      ({ code }) => diagnosticDefinitions[code].area === "hypothesis",
    );
    if (hypothesisDiagnostics.length > 0) casesReviewed += 1;
    return attempt.scaffoldingLevel
      ? hypothesisDiagnostics.map((diagnostic) => ({
          diagnostic,
          completedAt: attempt.completedAt,
          skillId: "hypothesis",
          scaffoldingLevel: attempt.scaffoldingLevel!,
          scope: "case",
        }))
      : [];
  });
  return {
    casesReviewed,
    diagnostics: summarizeDiagnostics(diagnostics),
  };
}

export function buildProgressDashboard(
  history: SkillAttempt[],
  rule: ConsistencyRule = DEFAULT_CONSISTENCY_RULE,
) {
  const legacyHistory = history.filter(
    (attempt) => (attempt.scoringVersion ?? "v1") === "v1",
  );
  const v2History = selectV2SkillHistory(history);

  return {
    v2: {
      sessionsCompleted: uniqueSessions(v2History),
      hypothesis: hypothesisDiagnosticSummary(v2History),
      skills: V2_TRAINABLE_SKILLS.map((skillId) => {
        const attempts = oldestFirst(
          v2History.filter((attempt) => attempt.skillId === skillId),
        );
        return {
          skillId,
          label: SKILL_LABELS[skillId],
          status: calculateV2EvidenceStatus(attempts, rule),
          attemptsCompleted: attempts.length,
          evidence: {
            committed: attempts.filter(
              isCommitted,
            ).length,
            reviewed: attempts.filter(isReviewed).length,
            revised: attempts.filter(isRevised).length,
            transferred: attempts.filter(
              (attempt) => attempt.attemptType === "case",
            ).length,
            reducedScaffolding: attempts.filter(
              (attempt) =>
                attempt.scaffoldingLevel === "intermediate" ||
                attempt.scaffoldingLevel === "interview",
            ).length,
            scaffolding: {
              beginner: attempts.filter(
                (attempt) => attempt.scaffoldingLevel === "beginner",
              ).length,
              intermediate: attempts.filter(
                (attempt) => attempt.scaffoldingLevel === "intermediate",
              ).length,
              interview: attempts.filter(
                (attempt) => attempt.scaffoldingLevel === "interview",
              ).length,
            },
          },
          diagnostics: diagnosticSummary(attempts),
        };
      }),
    },
    legacy: {
      sessionsCompleted: uniqueSessions(legacyHistory),
      skills: LEGACY_TRAINABLE_SKILLS.map((skillId) => {
        const attempts = oldestFirst(
          legacyHistory.filter((attempt) => attempt.skillId === skillId),
        ).slice(-10);
        const score = calculateRollingSkillScore(
          legacyHistory,
          skillId,
          "v1",
        );
        return {
          skillId,
          label: SKILL_LABELS[skillId],
          score,
          readiness: skillReadiness(score),
          attemptsCompleted: attempts.length,
          trend: attempts.map((attempt) => attempt.score),
          commonFeedbackCodes: commonFeedback(attempts),
        };
      }),
    },
  };
}

export function buildRecommendedSession(history: SkillAttempt[]) {
  const v2History = selectV2SkillHistory(history).filter(
    (attempt) =>
      V2_TRAINABLE_SKILLS.includes(attempt.skillId as TrainableSkillId),
  );
  const candidate = recurringDiagnosticCandidate(v2History);
  if (!candidate) {
    return {
      title: "V2 diagnostic mix",
      skillId: "clarification" as const,
      diagnosis: null,
      explanation: "Build a baseline across the V2 reasoning cycle.",
      practice: {
        kind: "drill" as const,
        id: "alpinefit-opening-clarification",
        contentVersion: 2 as const,
        label: "AlpineFit opening clarification",
        href: "/drills/clarification?rep=alpinefit-opening-clarification&version=2",
      },
    };
  }

  const area = diagnosticDefinitions[candidate.code].area;
  const skillId = diagnosticSkill(area);
  return {
    title: readableDiagnostic(candidate.code),
    skillId,
    diagnosis: candidate,
    explanation: `${candidate.count} recent ${candidate.source === "system" ? "system checks" : "self-assessments"} surfaced this pattern.`,
    practice: recommendationTarget(area, candidate.latestScaffoldingLevel),
  };
}

function readableDiagnostic(code: DiagnosticCode) {
  const text = code.replaceAll("_", " ");
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

function diagnosticSkill(area: DiagnosticArea): TrainableSkillId {
  if (V2_TRAINABLE_SKILLS.includes(area as TrainableSkillId)) {
    return area as TrainableSkillId;
  }
  return area === "recommendation" ? "synthesis" : "prioritization";
}

function uniqueCaseAttempts(history: SkillAttempt[]) {
  const seen = new Set<string>();
  return oldestFirst(history).filter((attempt) => {
    if (attempt.attemptType !== "case" || seen.has(attempt.attemptId)) return false;
    seen.add(attempt.attemptId);
    return true;
  });
}

function recurringDiagnosticCandidate(history: SkillAttempt[]) {
  const observations = [
    ...history.flatMap((attempt): DiagnosticObservation[] =>
      (attempt.diagnostics ?? []).flatMap((diagnostic) =>
        attempt.scaffoldingLevel
          ? [{
              diagnostic,
              completedAt: attempt.completedAt,
              skillId: attempt.skillId,
              scaffoldingLevel: attempt.scaffoldingLevel,
              scope: "skill",
            }]
          : [],
      ),
    ),
    ...uniqueCaseAttempts(history).flatMap((attempt): DiagnosticObservation[] =>
      (attempt.caseDiagnostics ?? []).flatMap((diagnostic) =>
        attempt.scaffoldingLevel
          ? [{
              diagnostic,
              completedAt: attempt.completedAt,
              skillId: diagnosticDefinitions[diagnostic.code].area,
              scaffoldingLevel: attempt.scaffoldingLevel,
              scope: "case",
            }]
          : [],
      ),
    ),
  ].filter(({ diagnostic }) => diagnostic.severity !== "strength");

  return summarizeDiagnostics(observations)
    .filter((diagnostic) => diagnostic.count >= 2)
    .filter((diagnostic) => {
      const relevant = diagnostic.scope === "case"
        ? uniqueCaseAttempts(history)
        : oldestFirst(history).filter(
            (attempt) => attempt.skillId === diagnostic.skillId && isReviewed(attempt),
          );
      const latest = relevant.at(-1);
      const latestDiagnostics = diagnostic.scope === "case"
        ? latest?.caseDiagnostics
        : latest?.diagnostics;
      return latestDiagnostics?.some(
        ({ code, source }) => code === diagnostic.code && source === diagnostic.source,
      );
    })
    .sort((left, right) => {
      const severity = { blocking: 2, coaching: 1, strength: 0 };
      return severity[right.severity] - severity[left.severity] ||
        Number(right.source === "system") - Number(left.source === "system") ||
        right.count - left.count ||
        right.lastSeenAt.localeCompare(left.lastSeenAt) ||
        left.code.localeCompare(right.code);
    })[0] ?? null;
}

function recommendationTarget(
  area: DiagnosticArea,
  scaffolding: DiagnosticObservation["scaffoldingLevel"],
) {
  if (area === "hypothesis" || area === "recommendation") {
    const target = scaffolding === "interview"
      ? { id: "goldenloaf-operations", label: "GoldenLoaf operations transfer" }
      : scaffolding === "intermediate"
        ? { id: "paypilot-growth", label: "PayPilot growth strategy" }
        : { id: "alpinefit-profitability", label: "AlpineFit profitability" };
    return {
      kind: "case" as const,
      ...target,
      contentVersion: 2 as const,
      href: `/cases/${target.id}?version=2`,
    };
  }

  const advanced = scaffolding !== "beginner";
  const targets = {
    clarification: advanced
      ? ["streamwave-opening-clarification", "StreamWave opening clarification"]
      : ["cedarcare-opening-clarification", "CedarCare opening clarification"],
    structure: advanced
      ? ["verdant-structure-v2", "Verdant structure transfer"]
      : ["quickcart-structure-v2", "QuickCart structure transfer"],
    prioritization: advanced
      ? ["urbaneats-prioritization-v2", "UrbanEats prioritization transfer"]
      : ["meridian-prioritization-v2", "Meridian prioritization transfer"],
    quantitative: advanced
      ? ["northwind-quantitative-v2", "Northwind quantitative transfer"]
      : ["harborcart-quantitative-v2", "HarborCart quantitative transfer"],
    exhibit: advanced
      ? ["cedarcare-exhibit-v2", "CedarCare exhibit transfer"]
      : ["beacon-exhibit-v2", "Beacon exhibit transfer"],
    synthesis: advanced
      ? ["brightlearn-synthesis-v2", "BrightLearn synthesis transfer"]
      : ["aeroparts-synthesis-v2", "AeroParts synthesis transfer"],
  } as const;
  const skillId = diagnosticSkill(area);
  const [id, label] = targets[skillId];
  return {
    kind: "drill" as const,
    id,
    contentVersion: 2 as const,
    label,
    href: `/drills/${skillId}?rep=${id}&version=2`,
  };
}
