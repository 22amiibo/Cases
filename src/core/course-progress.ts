import { CourseContextSchema, type CourseContext } from "./activity";
import type { CourseDefinition, CourseStep } from "./course";
import type { CourseEvidence } from "@/data/v3-repository";
import { getCourseDefinition } from "@/content/courses/catalog";

type Resource = { type: "lesson" | "activity" | "case"; id: string; contentVersion: number; mode?: string };
export function validateCourseContext(value: unknown, resource: Resource): CourseContext | null {
  if (value === undefined || value === null) return null;
  const context = CourseContextSchema.parse(value);
  const course = getCourseDefinition(context.courseId, context.courseVersion);
  const step = course?.steps.find(s => s.id === context.courseStepId);
  if (!course || course.status === "draft" || !step || step.resource.type !== resource.type || step.resource.id !== resource.id || step.resource.contentVersion !== resource.contentVersion || (step.resource.type === "case" && step.resource.mode !== resource.mode)) {
    throw new Error("Course context does not match exact resource");
  }
  return context;
}
export function courseContextFromQuery(query: Record<string, string | string[] | undefined>, resource: Resource) {
  const values = [query.course, query.courseVersion, query.step];
  if (values.every(value => value === undefined)) return null;
  if (values.some(Array.isArray)) throw new Error("Ambiguous course context");
  return validateCourseContext({ courseId: query.course, courseVersion: Number(query.courseVersion), courseStepId: query.step }, resource);
}
export function courseHref(course: Pick<CourseDefinition, "id" | "contentVersion">) {
  return `/learn/courses/${encodeURIComponent(course.id)}?version=${course.contentVersion}`;
}
export function courseStepHref(course: CourseDefinition, step: CourseStep) {
  const { resource } = step;
  const path = resource.type === "lesson" ? "/learn/lessons" : resource.type === "activity" ? "/practice/activities" : "/cases";
  return `${path}/${encodeURIComponent(resource.id)}?version=${resource.contentVersion}${resource.type === "case" ? "&mode=practice" : ""}&course=${encodeURIComponent(course.id)}&courseVersion=${course.contentVersion}&step=${encodeURIComponent(step.id)}`;
}
export function courseRunSuffix(context: CourseContext | null) {
  return context ? `:course:${context.courseId}:${context.courseVersion}:${context.courseStepId}` : "";
}
export function deriveCourseProgress(course: CourseDefinition, evidence: CourseEvidence, userId: string) {
  const enrollment = evidence.enrollments.find(e => e.userId === userId && e.courseId === course.id && e.courseVersion === course.contentVersion);
  const matches = (context: CourseContext | null, step: CourseStep) => context?.courseId === course.id && context.courseVersion === course.contentVersion && context.courseStepId === step.id;
  const completedStepIds = enrollment ? course.steps.filter(step => {
    const r = step.resource;
    if (r.type === "lesson") return evidence.lessonEvents.some(e => e.userId === userId && e.eventType === "lesson_viewed" && matches(e, step) && e.lessonId === r.id && e.lessonVersion === r.contentVersion);
    if (r.type === "activity") return evidence.activityAttempts.some(a => a.userId === userId && matches(a.courseContext, step) && a.activityId === r.id && a.contentVersion === r.contentVersion && a.scoringVersion === "v3" && a.events.some(e => e.type === "activity_completed"));
    return evidence.caseAttempts.some(a => a.userId === userId && matches(a.courseContext, step) && a.caseId === r.id && a.contentVersion === r.contentVersion && a.caseMode === r.mode && a.scoringVersion === "v3" && a.events.some(e => e.type === "recommendation_submitted"));
  }).map(s => s.id) : [];
  const nextStep = course.steps.find(s => !completedStepIds.includes(s.id)) ?? null;
  const capstone = evidence.caseAttempts.filter(a => a.userId === userId && a.scoringVersion === "v3" && a.events.some(e => e.type === "recommendation_submitted") && course.steps.some(s => s.resource.type === "case" && matches(a.courseContext, s) && a.caseId === s.resource.id && a.contentVersion === s.resource.contentVersion && a.caseMode === s.resource.mode && completedStepIds.includes(s.id))).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  return { enrollment, completedStepIds, nextStep, complete: !nextStep, capstone };
}
export function currentCourseStep(courses: CourseDefinition[], evidence: CourseEvidence, userId: string) {
  const enrolled = [...evidence.enrollments].filter(e => e.userId === userId).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  for (const entry of enrolled) {
    const course = courses.find(c => c.id === entry.courseId && c.contentVersion === entry.courseVersion && c.status !== "draft");
    if (!course) continue;
    const progress = deriveCourseProgress(course, evidence, userId);
    if (progress.nextStep) return { title: progress.nextStep.title, href: courseStepHref(course, progress.nextStep), explanation: `Continue ${course.title}: ${progress.completedStepIds.length} of ${course.steps.length} steps complete.` };
  }
  return null;
}
export function validateEnrollment(enrollment: CourseEvidence["enrollments"][number], existing = false, course = getCourseDefinition(enrollment.courseId, enrollment.courseVersion)) {
  if (!course || course.id !== enrollment.courseId || course.contentVersion !== enrollment.courseVersion || course.status === "draft" || (course.status !== "active" && !existing) || !course.steps.some(s => s.id === enrollment.lastStepId)) throw new Error("Course cannot be enrolled");
}
