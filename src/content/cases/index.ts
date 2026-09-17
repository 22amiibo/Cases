import alpineFitContent from "./alpinefit-profitability.json";
import alpineFitV2Content from "./alpinefit-profitability-v2";
import fleetFixContent from "./fleetfix-market-entry.json";
import goldenLoafContent from "./goldenloaf-operations.json";
import morningJetContent from "./morningjet-pricing-breakeven.json";
import northStarContent from "./northstar-profitability.json";
import payPilotContent from "./paypilot-growth.json";
import { CaseDefinitionSchema } from "@/core/schema";
import { assertValidCase } from "@/core/validation";
import { createVersionedRegistry } from "@/content/versioned-registry";

const authoredCases = [
  alpineFitContent,
  alpineFitV2Content,
  northStarContent,
  fleetFixContent,
  payPilotContent,
  goldenLoafContent,
  morningJetContent,
];

const versionedCaseDefinitions = authoredCases.map((content) => {
  const definition = CaseDefinitionSchema.parse(content);
  assertValidCase(definition);
  return definition;
});

export const activeCaseVersions = Object.freeze({
  "alpinefit-profitability": 2,
  "northstar-profitability": 1,
  "fleetfix-market-entry": 1,
  "paypilot-growth": 1,
  "goldenloaf-operations": 1,
  "morningjet-pricing-breakeven": 1,
}) as Readonly<Record<string, number>>;

const caseRegistry = createVersionedRegistry(
  versionedCaseDefinitions,
  activeCaseVersions,
  ({ version }) => version,
);

export const caseDefinitions = Object.keys(activeCaseVersions).map(
  (caseId) => caseRegistry.getActive(caseId)!,
);

export function getCaseDefinition(caseId: string, contentVersion?: number) {
  return contentVersion === undefined
    ? caseRegistry.getActive(caseId)
    : caseRegistry.get(caseId, contentVersion);
}

export function getCaseVersions(caseId: string) {
  return caseRegistry.getVersions(caseId);
}
