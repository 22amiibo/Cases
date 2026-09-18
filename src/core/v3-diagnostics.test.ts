import { describe, expect, it } from "vitest";
import { SKILL_LAB_IDS } from "./v3-taxonomy";
import {
  getV3DiagnosticDefinition,
  v3DiagnosticDefinitions,
} from "./v3-diagnostics";

describe("V3 diagnostic definitions", () => {
  it("uses unique stable codes with valid skill and recommendation ownership", () => {
    const codes = v3DiagnosticDefinitions.map(({ code }) => code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const definition of v3DiagnosticDefinitions) {
      expect(definition.allowedSources.length).toBeGreaterThan(0);
      expect(SKILL_LAB_IDS).toContain(definition.recommendation.labId);
      expect(definition.explanation.length).toBeGreaterThan(0);
      expect(definition.whyItMatters.length).toBeGreaterThan(0);
    }
  });

  it("keeps reused diagnostic ownership explicit", () => {
    expect(getV3DiagnosticDefinition("objective_not_reframed")).toMatchObject({
      skillId: "clarification",
      recommendation: { type: "lab", labId: "clarifying" },
    });
    expect(getV3DiagnosticDefinition("hypothesis_not_linked")).toMatchObject({
      skillId: "hypothesis",
      recommendation: { type: "lab", labId: "hypothesis" },
    });
    expect(getV3DiagnosticDefinition("brainstorm_breadth_narrow")).toMatchObject({
      skillId: "brainstorming",
      recommendation: { type: "lab", labId: "brainstorming" },
    });
  });

  it("links weaknesses to a same-skill strength code", () => {
    for (const definition of v3DiagnosticDefinitions) {
      if (!definition.supersedingStrengthCode) continue;
      const strength = getV3DiagnosticDefinition(definition.supersedingStrengthCode);
      expect(strength).toMatchObject({
        skillId: definition.skillId,
        severity: "strength",
      });
    }
  });
});
