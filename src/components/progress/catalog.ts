import { activityDefinitions, activeActivityDefinitions } from "@/content/activities";
import { getCaseMetadata } from "@/content/cases/metadata";
import { caseDefinitions, getCaseDefinition, getCaseVersions } from "@/content/cases";
import type { ProgressResource } from "@/core/v3-progress";
import type { PracticeOption } from "@/core/v3-recommendations";

const caseLabels: Record<string, string> = {
  "alpinefit-profitability": "AlpineFit profitability", "paypilot-growth": "PayPilot growth", "goldenloaf-operations": "GoldenLoaf operations", "northstar-profitability": "NorthStar profitability", "fleetfix-market-entry": "FleetFix market entry", "morningjet-pricing-breakeven": "MorningJet pricing",
};
// Only learner-facing metadata crosses into the dashboard; authored answers stay on the server.
export function progressCatalog(): { resources: ProgressResource[]; activities: PracticeOption[] } {
  return {
    resources: [
      ...activityDefinitions.map(({ id, contentVersion, title, status }) => ({ kind: "activity" as const, id, contentVersion, title, status })),
      ...caseDefinitions.flatMap(({ id }) => getCaseVersions(id).map(contentVersion => ({ kind: "case" as const, id, contentVersion, title: caseLabels[id] ?? getCaseDefinition(id, contentVersion)!.title, status: "active" as const, supportedModes: getCaseMetadata(id, contentVersion)?.supportedModes ?? ["practice"] }))),
    ],
    activities: activeActivityDefinitions.map(({ id, contentVersion, title, status, labId, primarySkillId, secondarySkillIds, difficulty, estimatedMinutes, industryIds, caseTypeIds, feedback }) => ({ id, contentVersion, title, status, labId, primarySkillId, secondarySkillIds, difficulty, estimatedMinutes, industryIds, caseTypeIds, diagnosticCodes: [...new Set(feedback.paths.flatMap(p => p.diagnosticCodes))] })),
  };
}
