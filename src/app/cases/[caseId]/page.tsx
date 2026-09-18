import { notFound } from "next/navigation";
import { caseDefinitions, getCaseDefinition } from "@/content/cases";
import { InvestigationPanel } from "@/components/investigation/InvestigationPanel";
import { toLearnerCaseDefinition } from "@/core/learner-case";

export function generateStaticParams() {
  return caseDefinitions.map(({ id: caseId }) => ({ caseId }));
}

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}) {
  const { caseId } = await params;
  const rawVersion = (await searchParams).version;
  const versionValue = Array.isArray(rawVersion) ? rawVersion[0] : rawVersion;
  const contentVersion = versionValue === undefined ? undefined : Number(versionValue);
  if (versionValue !== undefined && !Number.isInteger(contentVersion)) notFound();
  const caseDefinition = getCaseDefinition(caseId, contentVersion);
  if (!caseDefinition) notFound();

  return (
    <InvestigationPanel caseDefinition={toLearnerCaseDefinition(caseDefinition)} />
  );
}
