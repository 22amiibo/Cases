import { notFound } from "next/navigation";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { getActivityDefinition } from "@/content/activities";
import { projectLearnerActivity } from "@/core/activity-projection";

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ activityId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}) {
  const { activityId } = await params;
  const rawVersion = (await searchParams).version;
  const versionValue = Array.isArray(rawVersion) ? rawVersion[0] : rawVersion;
  const contentVersion = Number(versionValue);
  if (!Number.isInteger(contentVersion) || contentVersion < 1) notFound();
  const definition = getActivityDefinition(activityId, contentVersion);
  if (!definition) notFound();
  return <main><ActivityShell initial={projectLearnerActivity(definition)} /></main>;
}
