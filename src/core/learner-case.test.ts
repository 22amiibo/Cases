import { describe, expect, it } from "vitest";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
import { CaseDefinitionSchema } from "./schema";
import { toLearnerCaseDefinition } from "./learner-case";

describe("toLearnerCaseDefinition", () => {
  it("removes hidden scoring and causal metadata from the client payload", () => {
    const definition = CaseDefinitionSchema.parse(alpineFitContent);
    const learnerDefinition = toLearnerCaseDefinition(definition);
    const serialized = JSON.stringify(learnerDefinition);

    expect(serialized).not.toContain('"critical"');
    expect(serialized).not.toContain('"rootCause"');
    expect(serialized).not.toContain('"highValue"');
    expect(serialized).not.toContain('"frameworkRubric"');
    expect(serialized).not.toContain('"efficientPaths"');
    expect(serialized).not.toContain('"supportingEvidenceIds"');
    expect(serialized).not.toContain('"weight"');
    expect(serialized).not.toContain('"insights"');
  });
});
