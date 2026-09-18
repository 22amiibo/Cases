import { notFound } from "next/navigation";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { getActivityDefinition } from "@/content/activities";
import { getCaseDefinition } from "@/content/cases";
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
    exhibit={exhibit}
  /></main>;
}
