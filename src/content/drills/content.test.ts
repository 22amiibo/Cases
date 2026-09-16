import { describe, expect, it } from "vitest";
import { DrillDefinitionSchema } from "@/core/schema";

const drillModules = import.meta.glob("./*.json", {
  eager: true,
  import: "default",
});

describe("drill content", () => {
  it("contains ten valid exercises for each V1 drill skill", () => {
    const expectedSkills = [
      "structure",
      "prioritization",
      "quantitative",
      "exhibit",
      "synthesis",
    ];

    expect(Object.keys(drillModules)).toHaveLength(expectedSkills.length);

    expectedSkills.forEach((skillId) => {
      const entry = Object.entries(drillModules).find(([path]) =>
        path.endsWith(`/${skillId}.json`),
      );
      expect(entry, `${skillId} drill bank`).toBeDefined();

      const exercises = entry?.[1];
      expect(Array.isArray(exercises)).toBe(true);
      expect(exercises).toHaveLength(10);
      (exercises as unknown[]).forEach((exercise) => {
        const definition = DrillDefinitionSchema.parse(exercise);
        expect(definition.skillId).toBe(skillId);
      });
    });
  });
});
