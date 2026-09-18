import { notFound } from "next/navigation";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { activeActivityDefinitions, getActivityDefinition } from "@/content/activities";
import { getCaseDefinition } from "@/content/cases";
import { CourseContextSchema } from "@/core/activity";
import { projectLearnerActivity } from "@/core/activity-projection";

type Query = Record<string, string | string[] | undefined>;

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ activityId: string }>;
  searchParams: Promise<Query>;
}) {
  const { activityId } = await params;
  const query = await searchParams;
  if (Array.isArray(query.version)) notFound();
  const contentVersion = Number(query.version);
  if (!Number.isInteger(contentVersion) || contentVersion < 1) notFound();
  const courseValues = [query.course, query.courseVersion, query.step];
  if (courseValues.some(Array.isArray)) notFound();
  const hasCourseContext = courseValues.some((value) => value !== undefined);
  const parsedCourseContext = hasCourseContext
    ? CourseContextSchema.safeParse({
        courseId: query.course,
        courseVersion: Number(query.courseVersion),
        courseStepId: query.step,
      })
    : null;
  if (parsedCourseContext && !parsedCourseContext.success) notFound();
  const courseContext = parsedCourseContext?.data ?? null;
  const definition = getActivityDefinition(activityId, contentVersion);
  if (!definition) notFound();
  const labActivities = activeActivityDefinitions.filter(({ labId }) => labId === definition.labId);
  const activityIndex = labActivities.findIndex(({ id }) => id === definition.id);
  const nextActivity = labActivities[(activityIndex + 1) % labActivities.length];
  let exhibit;
  const interaction = definition.interaction;
  if (interaction.type === "exhibit_chain") {
    const caseDefinition = getCaseDefinition(
      interaction.caseId,
      interaction.caseContentVersion,
    );
    const authored = caseDefinition?.exhibits.find(
      ({ id }) => id === interaction.exhibitId,
    );
    if (!authored) notFound();
    exhibit = {
      id: authored.id,
      title: authored.title,
      type: authored.type,
      unit: authored.unit,
      columns: authored.columns,
      rows: authored.rows,
      series: authored.series,
      categories: authored.categories,
    };
  }
  return <main><ActivityShell
    initial={projectLearnerActivity(definition)}
    courseContext={courseContext}
    exhibit={exhibit}
    nextActivityHref={nextActivity && nextActivity.id !== definition.id
      ? `/practice/activities/${nextActivity.id}?version=${nextActivity.contentVersion}`
      : undefined}
  /></main>;
}
