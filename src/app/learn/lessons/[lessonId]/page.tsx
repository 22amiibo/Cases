import Link from "next/link";
import { notFound } from "next/navigation";
import { getLessonDefinition } from "@/content/lessons/index";
import { getCourseDefinition } from "@/content/courses";
import { courseContextFromQuery } from "@/core/course-progress";
import { CourseView } from "@/components/learn/CourseView";
import styles from "@/app/learn/learn.module.css";
export default async function LessonPage({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lessonId } = await params;
  const query = await searchParams;
  if (typeof query.version !== "string" || !Number.isInteger(Number(query.version)) || Number(query.version) < 1) notFound();
  const lesson = getLessonDefinition(lessonId, Number(query.version));
  if (!lesson) notFound();
  let context;
  try { context = courseContextFromQuery(query, { type: "lesson", id: lessonId, contentVersion: Number(query.version) }); } catch { notFound(); }
  if (context) {
    const course = getCourseDefinition(context.courseId, context.courseVersion)!;
    return <CourseView course={course} lesson={lesson} step={course.steps.find(s => s.id === context.courseStepId)!} nextPracticeHref="/practice/activities/paypilot-clarifying-v3?version=1" />;
  }
  return <main className={styles.page}><Link href="/learn">← Learn</Link><article className={styles.lesson}><h1>{lesson.title}</h1><p>{lesson.summary}</p><ul>{lesson.principles.map(p => <li key={p}>{p}</li>)}</ul><p>{lesson.example}</p><Link href={lesson.drillRoute}>Practice this lesson</Link></article></main>;
}
