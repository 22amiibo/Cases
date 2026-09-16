import { notFound } from "next/navigation";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { InvestigationPanel } from "@/components/investigation/InvestigationPanel";
import { toLearnerCaseDefinition } from "@/core/learner-case";
import { CaseDefinitionSchema } from "@/core/schema";

const alpineFit = CaseDefinitionSchema.parse(alpineFitContent);

export function generateStaticParams() {
  return [{ caseId: alpineFit.id }];
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  if (caseId !== alpineFit.id) notFound();

  return (
    <InvestigationPanel caseDefinition={toLearnerCaseDefinition(alpineFit)} />
  );
}
