import { courseRunSuffix, validateCourseContext } from "./course-progress";
import type { CourseContext } from "./activity";
import { ActivityEventSchema } from "./activity";
import { CaseEventSchema } from "./schema";
import type { ProgressResource } from "./v3-progress";
import type { ActivityAttempt, ActivityDefinition } from "./activity";
import { getV3DiagnosticDefinition } from "./v3-diagnostics";
import type { buildV3Progress } from "./v3-progress";
export type PracticeOption = Pick<ActivityDefinition, "id" | "contentVersion" | "title" | "status" | "labId" | "primarySkillId" | "secondarySkillIds" | "difficulty" | "estimatedMinutes" | "industryIds" | "caseTypeIds"> & { diagnosticCodes: string[] };
export type RecoverableRun = { title: string; href: string; updatedAt: string };
export type CourseRecommendationStep = { title: string; href: string; explanation: string };
export type V3Recommendation = CourseRecommendationStep & { reason: "resume" | "course" | "blocking" | "coaching" | "transfer" | "unpracticed"; estimatedMinutes?: number };
export function activityHref(activity: Pick<PracticeOption, "id" | "contentVersion">) {
  return `/practice/activities/${encodeURIComponent(activity.id)}?version=${activity.contentVersion}`;
}
export function selectV3Recommendation({ activities, attempts, skills, runs = [], courseStep = null }: {
  activities: PracticeOption[]; attempts: ActivityAttempt[]; skills: ReturnType<typeof buildV3Progress>; runs?: RecoverableRun[]; courseStep?: CourseRecommendationStep | null;
}): V3Recommendation | null {
  const run = [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.href.localeCompare(b.href))[0];
  if (run) return { ...run, reason: "resume", explanation: "Your unfinished practice is saved in this browser. Pick up where you left off." };
  if (courseStep) return { ...courseStep, reason: "course" };
  const active = activities.filter(a => a.status === "active").sort((a, b) => a.estimatedMinutes - b.estimatedMinutes || a.id.localeCompare(b.id));
  const completed = new Set(attempts.filter(a => a.scoringVersion === "v3").map(a => a.activityId));
  const recommendation = (activity: PracticeOption, reason: V3Recommendation["reason"], explanation: string): V3Recommendation => ({ title: activity.title, href: activityHref(activity), estimatedMinutes: activity.estimatedMinutes, reason, explanation });
  const candidates = skills.flatMap(s => [...s.recurringDiagnostics, ...s.diagnostics.filter(d => !d.recurring)]).flatMap(diagnostic => {
    const targets = active.filter(a => a.diagnosticCodes.includes(diagnostic.code) || a.labId === getV3DiagnosticDefinition(diagnostic.code)?.recommendation.labId);
    const activity = targets.find(a => a.id !== diagnostic.activityId && !completed.has(a.id)) ?? targets.find(a => a.id !== diagnostic.activityId) ?? targets[0];
    return activity ? [{ diagnostic, activity }] : [];
  }).sort((a, b) => Number(b.diagnostic.recurring) - Number(a.diagnostic.recurring) || b.diagnostic.completedAt.localeCompare(a.diagnostic.completedAt) || Number(b.diagnostic.severity === "blocking") - Number(a.diagnostic.severity === "blocking") || a.activity.estimatedMinutes - b.activity.estimatedMinutes || a.activity.id.localeCompare(b.activity.id) || a.diagnostic.code.localeCompare(b.diagnostic.code));
  if (candidates[0]) {
    const { diagnostic, activity } = candidates[0];
    return recommendation(activity, diagnostic.recurring ? "blocking" : "coaching", `${diagnostic.sourceLabel}: ${diagnostic.explanation} ${diagnostic.recurring ? "This appeared in at least 2 of your last 3 reviewed attempts." : "This is your most recent unresolved coaching point."} Try it in another context.`);
  }
  const transfers = skills.filter(s => s.status === "Developing" && s.transferred === 0).flatMap(skill => {
    const activity = active.find(a => (a.primarySkillId === skill.skillId || a.secondarySkillIds.includes(skill.skillId)) && !completed.has(a.id));
    return activity ? [{ skill, activity }] : [];
  }).sort((a, b) => (b.skill.latestCompletedAt ?? "").localeCompare(a.skill.latestCompletedAt ?? "") || a.activity.estimatedMinutes - b.activity.estimatedMinutes || a.activity.id.localeCompare(b.activity.id) || a.skill.skillId.localeCompare(b.skill.skillId));
  if (transfers[0]) {
    const { skill, activity } = transfers[0];
    return recommendation(activity, "transfer", `${skill.reviewed} reviewed ${skill.label.toLowerCase()} practice${skill.reviewed === 1 ? "" : "s"}; no retry or case application yet. Apply the skill in a new context.`);
  }
  const activity = active.find(a => !completed.has(a.id));
  return activity ? recommendation(activity, "unpracticed", `You have not tried this activity yet. Start with a short ${activity.estimatedMinutes}-minute practice.`) : null;
}
export async function findRecoverableRuns(entries: [string, string][], resources: ProgressResource[], validate: (request: { endpoint: string; body: { contentVersion: number; events: unknown[]; mode?: "practice" | "interview"; courseContext?: CourseContext | null } }) => Promise<boolean>): Promise<RecoverableRun[]> {
  const runs: RecoverableRun[] = [];
  for (const [key, serialized] of entries) {
    try {
      const value = JSON.parse(serialized);
      if (!value || typeof value !== "object") continue;
      const baseKey = key.split(":course:")[0];
      const activity = /^casework:v3-activity:([^:]+):(\d+)$/.exec(baseKey);
      const caseRun = /^casework:guest-session:([^:]+)(?::(interview))?$/.exec(baseKey);
      const resource = resources.find(r => r.id === (activity?.[1] ?? caseRun?.[1]) && r.kind === (activity ? "activity" : "case") && r.contentVersion === (activity ? Number(activity[2]) : value.contentVersion ?? 1));
      if (!resource || resource.status !== "active") continue;
      const courseContext = validateCourseContext(value.courseContext, { type: activity ? "activity" : "case", id: resource.id, contentVersion: resource.contentVersion, mode: caseRun?.[2] ?? "practice" });
      if (baseKey + courseRunSuffix(courseContext) !== key) continue;
      const courseQuery = courseContext ? `&course=${encodeURIComponent(courseContext.courseId)}&courseVersion=${courseContext.courseVersion}&step=${encodeURIComponent(courseContext.courseStepId)}` : "";
      if (activity) {
        const events = ActivityEventSchema.array().safeParse(value.events);
        if (!events.success || events.data.length === 0 || events.data[0].type !== "activity_started" || events.data.some(e => e.type === "activity_completed") || value.completedAt || typeof value.attemptId !== "string" || !Number.isFinite(Date.parse(value.startedAt))) continue;
        if (!await validate({ endpoint: `/api/activities/${encodeURIComponent(resource.id)}/session`, body: { contentVersion: resource.contentVersion, events: events.data, ...(courseContext ? { courseContext } : {}) } })) continue;
        runs.push({ title: resource.title, href: activityHref(resource) + courseQuery, updatedAt: new Date(Date.parse(value.startedAt) + Math.max(...events.data.map(e => e.atMs))).toISOString() });
      } else if (caseRun) {
        const mode = caseRun[2] === "interview" ? "interview" : "practice";
        if (!(resource.supportedModes ?? ["practice"]).includes(mode)) continue;
        const events = CaseEventSchema.array().safeParse(value.events);
        const drafts = value.clarificationDraftIds;
        if (!events.success || events.data.some(e => e.type === "recommendation_submitted") || !Number.isFinite(value.runStartedAtMs) || (drafts !== undefined && (!Array.isArray(drafts) || drafts.some(id => typeof id !== "string")))) continue;
        if (!events.data.length && !drafts?.length && value.clarificationComplete !== true) continue;
        if (!await validate({ endpoint: `/api/cases/${encodeURIComponent(resource.id)}/session`, body: { contentVersion: resource.contentVersion, mode, events: events.data, ...(courseContext ? { courseContext } : {}) } })) continue;
        runs.push({ title: resource.title, href: `/cases/${encodeURIComponent(resource.id)}?version=${resource.contentVersion}&mode=${caseRun[2] ?? "practice"}${courseQuery}`, updatedAt: new Date(value.runStartedAtMs + Math.max(0, ...events.data.map(e => e.atMs))).toISOString() });
      }
    } catch { /* A damaged local run must not hide saved progress. */ }
  }
  return runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.href.localeCompare(b.href));
}
