import type { DiagnosticOutcome, V2SkillId } from "./schema";
import type { SkillAttempt } from "@/data/repository";
import { diagnosticDefinitions } from "./diagnostics";
import {
  calculateRollingSkillScore,
  recommendNextPractice,
} from "./progress";

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

function summarizeDiagnostics(diagnostics: DiagnosticOutcome[]) {
  const counts = new Map<string, { diagnostic: DiagnosticOutcome; count: number }>();
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.source}:${diagnostic.code}`;
    const prior = counts.get(key);
    counts.set(key, { diagnostic, count: (prior?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.diagnostic.code.localeCompare(right.diagnostic.code),
  );
}

function diagnosticSummary(attempts: SkillAttempt[]) {
  return summarizeDiagnostics(
    attempts.flatMap((attempt) => attempt.diagnostics ?? []),
  );
}

function hypothesisDiagnosticSummary(attempts: SkillAttempt[]) {
  const seenCaseAttempts = new Set<string>();
  let casesReviewed = 0;
  const diagnostics = attempts.flatMap((attempt) => {
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
    return hypothesisDiagnostics;
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
  const v2History = history.filter(
    (attempt) => attempt.scoringVersion === "v2",
  );

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
  const v2History = history.filter(
    (attempt) =>
      attempt.scoringVersion === "v2" &&
      V2_TRAINABLE_SKILLS.includes(attempt.skillId as TrainableSkillId),
  );
  const recommendation = recommendNextPractice(v2History, "v2");
  const skillId =
    recommendation.kind === "skill" &&
    V2_TRAINABLE_SKILLS.includes(recommendation.skillId as TrainableSkillId)
      ? (recommendation.skillId as TrainableSkillId)
      : "clarification";

  return {
    title:
      recommendation.kind === "skill"
        ? SKILL_LABELS[skillId]
        : "V2 diagnostic mix",
    skillId,
    drillHref: `/drills/${skillId}`,
    caseTitle: "AlpineFit",
    caseHref: "/cases/alpinefit-profitability",
  };
}
