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
  searchParams: Promise<{ version?: string | string[]; mode?: string | string[] }>;
}) {
  const { caseId } = await params;
  const query = await searchParams;
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

  return (
    <InvestigationPanel caseDefinition={toLearnerCaseDefinition(caseDefinition, {
      mode: mode.data,
      contentVersion: caseDefinition.version,
    })} />
  );
}
