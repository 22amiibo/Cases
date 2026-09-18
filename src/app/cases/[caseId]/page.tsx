import { courseContextFromQuery, courseRunSuffix } from "@/core/course-progress";
import { notFound } from "next/navigation";
import { caseDefinitions, getCaseDefinition } from "@/content/cases";
import { getCaseMetadata } from "@/content/cases/metadata";
import { InvestigationPanel } from "@/components/investigation/InvestigationPanel";
import { toLearnerCaseDefinition } from "@/core/learner-case";
import { CaseModeSchema } from "@/core/v3-taxonomy";

export function generateStaticParams() {
  return caseDefinitions.map(({ id: caseId }) => ({ caseId }));
}

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { caseId } = await params;
  const query = await searchParams;
  if (Array.isArray(query.version) || Array.isArray(query.mode)) notFound();
  const rawVersion = query.version;
  const versionValue = Array.isArray(rawVersion) ? rawVersion[0] : rawVersion;
  const contentVersion = versionValue === undefined ? undefined : Number(versionValue);
  const rawMode = query.mode;
  const modeValue = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  if (versionValue !== undefined && !Number.isInteger(contentVersion)) notFound();
  const caseDefinition = getCaseDefinition(caseId, contentVersion);
  if (!caseDefinition) notFound();
  const mode = CaseModeSchema.safeParse(modeValue ?? "practice");
  if (!mode.success || (
    mode.data === "interview" && !getCaseMetadata(caseId, caseDefinition.version)?.supportedModes.includes("interview")
  )) notFound();

  let courseContext;
  try { courseContext = courseContextFromQuery(query, { type: "case", id: caseId, contentVersion: caseDefinition.version, mode: mode.data }); }
  catch { notFound(); }
  return (
    <InvestigationPanel key={`${caseId}:${caseDefinition.version}:${mode.data}${courseRunSuffix(courseContext)}`} courseContext={courseContext} caseDefinition={toLearnerCaseDefinition(caseDefinition, {
      mode: mode.data,
      contentVersion: caseDefinition.version,
    })} />
  );
}
