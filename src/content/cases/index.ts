import alpineFitContent from "./alpinefit-profitability.json";
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
  northStarContent,
  fleetFixContent,
  payPilotContent,
  goldenLoafContent,
  morningJetContent,
];

export const caseDefinitions = authoredCases.map((content) => {
  const definition = CaseDefinitionSchema.parse(content);
  assertValidCase(definition);
  return definition;
});

export const activeCaseVersions = Object.freeze(
  Object.fromEntries(caseDefinitions.map(({ id, version }) => [id, version])),
) as Readonly<Record<string, number>>;

const caseRegistry = createVersionedRegistry(
  caseDefinitions,
  activeCaseVersions,
  ({ version }) => version,
);

export function getCaseDefinition(caseId: string, contentVersion?: number) {
  return contentVersion === undefined
    ? caseRegistry.getActive(caseId)
    : caseRegistry.get(caseId, contentVersion);
}

export function getCaseVersions(caseId: string) {
  return caseRegistry.getVersions(caseId);
}
