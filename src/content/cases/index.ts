import alpineFitContent from "./alpinefit-profitability.json";
import fleetFixContent from "./fleetfix-market-entry.json";
import goldenLoafContent from "./goldenloaf-operations.json";
import morningJetContent from "./morningjet-pricing-breakeven.json";
import northStarContent from "./northstar-profitability.json";
import payPilotContent from "./paypilot-growth.json";
import { CaseDefinitionSchema } from "@/core/schema";
import { assertValidCase } from "@/core/validation";

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

export function getCaseDefinition(caseId: string) {
  return caseDefinitions.find((definition) => definition.id === caseId);
}
