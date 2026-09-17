import { notFound } from "next/navigation";
import { caseDefinitions, getCaseDefinition } from "@/content/cases";
import { InvestigationPanel } from "@/components/investigation/InvestigationPanel";
import { toLearnerCaseDefinition } from "@/core/learner-case";

export function generateStaticParams() {
  return caseDefinitions.map(({ id: caseId }) => ({ caseId }));
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const caseDefinition = getCaseDefinition(caseId);
  if (!caseDefinition) notFound();

  return (
    <InvestigationPanel caseDefinition={toLearnerCaseDefinition(caseDefinition)} />
  );
}
