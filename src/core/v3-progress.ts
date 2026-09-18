import type { ActivityAttempt, V3DiagnosticOutcome, V3SkillEvidence } from "./activity";
import type { SkillAttempt } from "@/data/repository";
import type { V3CaseAttempt } from "@/data/v3-repository";
import { diagnosticDefinitions, type DiagnosticCode } from "./diagnostics";
import { getV3DiagnosticDefinition } from "./v3-diagnostics";
import { V3_SKILL_IDS, V3_SKILL_LABELS } from "./v3-taxonomy";

export const V3_EVIDENCE_POLICY = Object.freeze({ recentAttempts: 3, recurringBlockerCount: 2, failedChecks: 2, consistentAttempts: 3, distinctContextsOrLevels: 2 });
export type ProgressResource = {
  kind: "activity" | "case"; id: string; contentVersion: number; title: string; status: "active" | "retired" | "draft";
};
export type CoachingDiagnostic = V3DiagnosticOutcome & { sourceLabel: string; explanation: string; completedAt: string; activityId?: string; recurring: boolean };
const strengths = { structure: "strong_structure", prioritization: "strong_priority", quantitative: "strong_quantitative_reasoning", synthesis: "strong_synthesis", recommendation: "strong_recommendation" };

export function buildV3Progress(activities: ActivityAttempt[], cases: V3CaseAttempt[]) {
  const attempts = [...new Map([...activities, ...cases].filter(a => a.scoringVersion === "v3").map(a => [a.attemptId, a])).values()]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt) || a.attemptId.localeCompare(b.attemptId));
  return V3_SKILL_IDS.map(skillId => {
    const applicable = attempts.flatMap(attempt => {
      const evidence: V3SkillEvidence[] = attempt.skillEvidence.filter(e => e.skillId === skillId && e.reviewed);
      // Existing full-case saves carry reviewed diagnostics before they carry skillEvidence.
      if ("caseId" in attempt && !attempt.skillEvidence.some(e => e.skillId === skillId) && attempt.diagnostics.some(d => d.skillId === skillId)) {
        evidence.push({ skillId, source: "case", contextId: attempt.caseId, difficulty: attempt.scaffoldingLevel === "interview" ? "advanced" : attempt.scaffoldingLevel ?? "beginner", reviewed: true, retryOrTransfer: true, objectiveChecks: [], diagnosticCodes: attempt.diagnostics.filter(d => d.skillId === skillId).map(d => d.code) });
      }
      return evidence.length ? [{ attempt, evidence }] : [];
    });
    const recent = applicable.slice(0, V3_EVIDENCE_POLICY.recentAttempts);
    const blockers = new Map<string, number>();
    for (const { attempt } of recent) {
      for (const code of new Set(attempt.diagnostics.filter(d => d.skillId === skillId && d.severity === "blocking").map(d => d.code))) blockers.set(code, (blockers.get(code) ?? 0) + 1);
    }
    const recurringCodes = [...blockers].filter(([, count]) => count >= V3_EVIDENCE_POLICY.recurringBlockerCount).map(([code]) => code);
    const checks = applicable.flatMap(({ evidence }) => evidence.flatMap(e => [...e.objectiveChecks].reverse())).slice(0, V3_EVIDENCE_POLICY.failedChecks);
    const latestChecksFailed = checks.length === V3_EVIDENCE_POLICY.failedChecks && checks.every(c => !c.passed);
    const evidence = applicable.flatMap(a => a.evidence);
    const contexts = new Set<string>();
    let transferred = 0;
    for (const { attempt, evidence } of [...applicable].reverse()) {
      if ("caseId" in attempt || evidence.some(e => e.retryOrTransfer || (contexts.size > 0 && !contexts.has(e.contextId)))) transferred++;
      evidence.forEach(e => contexts.add(e.contextId));
    }
    const breadth = new Set(evidence.map(e => e.contextId)).size >= V3_EVIDENCE_POLICY.distinctContextsOrLevels || new Set(evidence.map(e => e.difficulty)).size >= V3_EVIDENCE_POLICY.distinctContextsOrLevels;
    const status = applicable.length === 0 ? "Not started" : recurringCodes.length || latestChecksFailed ? "Needs practice" : applicable.length >= V3_EVIDENCE_POLICY.consistentAttempts && transferred > 0 && breadth ? "Consistent" : "Developing";
    const diagnostics: CoachingDiagnostic[] = [];
    const seen = new Set<string>();
    for (const { attempt } of applicable) {
      for (const diagnostic of attempt.diagnostics.filter(d => d.skillId === skillId && d.severity !== "strength")) {
        const key = `${diagnostic.source}:${diagnostic.code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const definition = getV3DiagnosticDefinition(diagnostic.code);
        const strength = definition?.supersedingStrengthCode ?? strengths[skillId as keyof typeof strengths];
        const resolved = applicable.some(({ attempt: later }) => later.completedAt > attempt.completedAt && later.diagnostics.some(d => d.source === diagnostic.source && d.skillId === skillId && d.code === strength && d.severity === "strength"));
        if (resolved) continue;
        diagnostics.push({ ...diagnostic, sourceLabel: diagnostic.source === "self_assessment" ? "Your reflection" : "Coach feedback", explanation: definition?.explanation ?? diagnosticDefinitions[diagnostic.code as DiagnosticCode]?.explanation ?? "Review this skill and try another practice.", completedAt: attempt.completedAt, ...("activityId" in attempt ? { activityId: attempt.activityId } : {}), recurring: recurringCodes.includes(diagnostic.code) });
      }
    }
    return { skillId, label: V3_SKILL_LABELS[skillId], status, reviewed: applicable.length, transferred, diagnostics, recurringCodes, latestCompletedAt: applicable[0]?.attempt.completedAt ?? null };
  });
}

export type HistoryItem = { id: string; kind: "activity" | "case" | "drill"; completedAt: string; title: string; href: string | null; availability: "available" | "retired" | "unavailable" };
export function buildUnifiedHistory(history: SkillAttempt[], activities: ActivityAttempt[], cases: V3CaseAttempt[], resources: ProgressResource[]): HistoryItem[] {
  const rows: HistoryItem[] = [];
  for (const attempt of [...activities, ...cases, ...history]) {
    const kind = "activityId" in attempt ? "activity" : "caseId" in attempt && attempt.caseId ? "case" : "drill";
    if (rows.some(row => row.id === attempt.attemptId && row.kind === kind)) continue;
    const resourceId = "activityId" in attempt ? attempt.activityId : "caseId" in attempt ? attempt.caseId : undefined;
    const resource = resources.find(r => r.kind === kind && r.id === resourceId && r.contentVersion === (attempt.contentVersion ?? 1));
    const skillId = "primarySkillId" in attempt ? attempt.primarySkillId : "skillId" in attempt ? attempt.skillId : null;
    rows.push({ id: attempt.attemptId, kind, completedAt: attempt.completedAt, title: resource?.title ?? resources.find(r => r.kind === kind && r.id === resourceId)?.title ?? (kind === "case" ? "Case practice" : `${skillId ? V3_SKILL_LABELS[skillId] : "Focused"} practice`), href: kind === "activity" ? `/practice/attempts/${encodeURIComponent(attempt.attemptId)}` : kind === "case" ? `/cases/${encodeURIComponent(resourceId!)}/attempts/${encodeURIComponent(attempt.attemptId)}` : null, availability: !resource ? "unavailable" : resource.status === "retired" ? "retired" : "available" });
  }
  return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt) || a.id.localeCompare(b.id));
}
