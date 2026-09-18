import { notFound } from "next/navigation";
import { getCourseDefinition } from "@/content/courses";
import { CourseView } from "@/components/learn/CourseView";
export default async function CoursePage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ version?: string | string[] }> }) {
  const { courseId } = await params;
  const query = await searchParams;
  if (query.version !== undefined && (typeof query.version !== "string" || !Number.isInteger(Number(query.version)) || Number(query.version) < 1)) notFound();
  const course = getCourseDefinition(courseId, query.version === undefined ? undefined : Number(query.version));
  if (!course || course.status === "draft") notFound();
  return <CourseView course={course} nextPracticeHref="/practice/activities/paypilot-clarifying-v3?version=1" />;
}
