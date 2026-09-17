import { describe, expect, it } from "vitest";
import {
  DrillDefinitionSchema,
  V2ClarificationDrillDefinitionSchema,
} from "@/core/schema";
import { clarificationV2Definition, getDrillDefinition } from ".";

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

    expect(Object.keys(drillModules).filter((path) => !path.includes("-v2"))).toHaveLength(expectedSkills.length);

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

  it("resolves V1 drills by explicit historical version", () => {
    for (const exercises of Object.entries(drillModules)
      .filter(([path]) => !path.includes("-v2"))
      .map(([, content]) => content)) {
      for (const exercise of exercises as unknown[]) {
        const definition = DrillDefinitionSchema.parse(exercise);
        expect(getDrillDefinition(definition.id, 1)).toBeDefined();
        expect(getDrillDefinition(definition.id, 99)).toBeUndefined();
        expect(getDrillDefinition(definition.id)).toBe(
          getDrillDefinition(definition.id, 1),
        );
      }
    }
  });

  it("publishes exactly one initial V2 clarification rep", () => {
    expect(V2ClarificationDrillDefinitionSchema.parse(clarificationV2Definition)).toEqual(
      clarificationV2Definition,
    );
    expect(getDrillDefinition(clarificationV2Definition.id, 2)).toBe(
      clarificationV2Definition,
    );
    expect(getDrillDefinition(clarificationV2Definition.id, 1)).toBeUndefined();
  });
});
