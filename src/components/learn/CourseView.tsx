"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CourseDefinition, CourseStep } from "@/core/course";
import type { LessonDefinition } from "@/content/lessons/index";
import { courseHref, courseStepHref, deriveCourseProgress, validateCourseContext } from "@/core/course-progress";
import { usePracticeProgress } from "@/components/progress/usePracticeProgress";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { V3Repository } from "@/data/v3-repository";
import styles from "@/app/learn/learn.module.css";

export function CourseView({ course, lesson, step, nextPracticeHref }: { course: CourseDefinition; lesson?: LessonDefinition; step?: CourseStep; nextPracticeHref: string }) {
  const progress = usePracticeProgress();
  const derived = deriveCourseProgress(course, progress.courseEvidence, progress.userId ?? "");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const recording = useRef(false);
  const retry = progress.retry;
  useEffect(() => {
    if (error || !lesson || !step || progress.status !== "ready" || !derived.enrollment || derived.completedStepIds.includes(step.id) || recording.current) return;
    recording.current = true;
    void (async () => {
      try {
        const { repository, userId } = await getBrowserPracticeSession();
        if (userId !== progress.userId) throw new Error("Account changed; reload the lesson");
        const context = validateCourseContext({ courseId: course.id, courseVersion: course.contentVersion, courseStepId: step.id }, { type: "lesson", id: lesson.id, contentVersion: lesson.contentVersion ?? 1 })!;
        const evidence = await (repository as V3Repository).listCourseEvidence(userId);
        const existing = evidence.lessonEvents.find(e => e.courseId === course.id && e.courseVersion === course.contentVersion && e.courseStepId === step.id);
        if (!existing) await (repository as V3Repository).recordLessonViewed({ ...context, userId, eventType: "lesson_viewed", lessonId: lesson.id, lessonVersion: lesson.contentVersion ?? 1, occurredAt: new Date().toISOString() });
        retry();
      } catch { setError(true); }
      finally { recording.current = false; }
    })();
  }, [error, course, lesson, step, progress.status, progress.userId, derived.enrollment, derived.completedStepIds, retry]);

  async function enroll() {
    setSaving(true); setError(false);
    try {
      const { repository, userId } = await getBrowserPracticeSession();
      const now = new Date().toISOString();
      await (repository as V3Repository).enroll({ userId, courseId: course.id, courseVersion: course.contentVersion, startedAt: now, lastActivityAt: now, lastStepId: course.steps[0].id });
      progress.retry();
    } catch { setError(true); }
    finally { setSaving(false); }
  }
  const practice = lesson?.practice;
  const lessonPractice = practice && "activityId" in practice
    ? course.steps.find(s => s.resource.type === "activity" && s.resource.id === practice.activityId && s.resource.contentVersion === practice.contentVersion)
    : undefined;
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/learn">← Learn</Link><Link href={courseHref(course)}>{course.title} course</Link></header>
    <section className={`${styles.intro} ${styles.course}`}><p>{course.estimatedMinutes} minutes · {course.steps.length} steps</p><h1>{lesson?.title ?? `${course.title} course`}</h1>
      {progress.status === "loading" && <p role="status">Loading course progress…</p>}
      {progress.status === "error" && <p role="alert">Course progress could not be loaded. <button onClick={progress.retry}>Try again</button></p>}
      {progress.status === "ready" && <>
        <p>{derived.completedStepIds.length} of {course.steps.length} steps complete</p>
        <p>{progress.userId === "guest" ? "Guest progress is saved for this browser session." : "Your course progress is saved to your account."}</p>
        {!derived.enrollment ? course.status === "active" ? <button disabled={saving} onClick={() => void enroll()}>Enroll in course</button> : <p>This retired course is available to prior learners.</p> : <>
          {course.status === "retired" && <p>Retired course · your exact version and history are preserved.</p>}
          {lesson && <article className={styles.lesson}><p>{lesson.summary}</p><ul>{lesson.principles.map(p => <li key={p}>{p}</li>)}</ul><p>{lesson.example}</p><Link href={lessonPractice ? courseStepHref(course, lessonPractice) : lesson.drillRoute}>Practice this lesson</Link></article>}
          {derived.nextStep && (!lesson || derived.completedStepIds.includes(step!.id)) && <Link href={courseStepHref(course, derived.nextStep)}>Continue course</Link>}
          {derived.complete && <section><h2>Course complete</h2><p>You clarified the decision, explored profit drivers, interpreted evidence, and applied your reasoning in AlpineFit. Review where the evidence changed your hypothesis and what you would test next.</p>{derived.capstone && <Link href={`/cases/${derived.capstone.caseId}/attempts/${encodeURIComponent(derived.capstone.attemptId)}`}>Review capstone debrief</Link>}<p><Link href={nextPracticeHref}>Next practice</Link></p></section>}
          {!lesson && <ol>{course.steps.map(s => <li key={s.id}><Link href={courseStepHref(course, s)}>{s.title}</Link>{derived.completedStepIds.includes(s.id) ? " — Complete" : ""}</li>)}</ol>}
        </>}
      </>}
      {error && <p role="alert">Course progress was not saved. <button onClick={() => { setError(false); progress.retry(); }}>Try again</button></p>}
    </section>
  </main>;
}
