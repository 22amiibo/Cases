import { describe, expect, it } from "vitest";
import {
  DrillDefinitionSchema,
  V2ClarificationDrillDefinitionSchema,
  V2PracticeDrillDefinitionSchema,
} from "@/core/schema";
import {
  clarificationV2Definition,
  drillBanks,
  getDrillDefinition,
  v2DrillDefinitions,
  v2PracticeDefinitions,
} from ".";

describe("drill content", () => {
  it("contains ten valid exercises for each V1 drill skill", () => {
    const expectedSkills = [
      "structure",
      "prioritization",
      "quantitative",
      "exhibit",
      "synthesis",
    ];

    expect(Object.keys(drillBanks)).toHaveLength(expectedSkills.length);

    expectedSkills.forEach((skillId) => {
      const exercises = drillBanks[skillId as keyof typeof drillBanks];
      expect(exercises).toHaveLength(10);
      exercises.forEach((exercise) => {
        const definition = DrillDefinitionSchema.parse(exercise);
        expect(definition.skillId).toBe(skillId);
      });
    });
  });

  it("resolves V1 drills by explicit historical version", () => {
    for (const exercises of Object.values(drillBanks)) {
      for (const exercise of exercises) {
        const definition = DrillDefinitionSchema.parse(exercise);
        expect(getDrillDefinition(definition.id, 1)).toBeDefined();
        expect(getDrillDefinition(definition.id, 99)).toBeUndefined();
        expect(getDrillDefinition(definition.id)).toBe(
          getDrillDefinition(definition.id, 1),
        );
      }
    }
  });

  it("publishes exactly one validated V2 rep per trainable skill", () => {
    expect(V2ClarificationDrillDefinitionSchema.parse(clarificationV2Definition)).toEqual(
      clarificationV2Definition,
    );
    expect(getDrillDefinition(clarificationV2Definition.id, 2)).toBe(
      clarificationV2Definition,
    );
    expect(getDrillDefinition(clarificationV2Definition.id, 1)).toBeUndefined();
    expect(V2PracticeDrillDefinitionSchema.array().parse(v2PracticeDefinitions)).toEqual(
      v2PracticeDefinitions,
    );
    expect(v2DrillDefinitions).toHaveLength(6);
    expect(new Set(v2DrillDefinitions.map(({ id }) => id)).size).toBe(6);
    expect(v2DrillDefinitions.map(({ skillId }) => skillId).sort()).toEqual([
      "clarification",
      "exhibit",
      "prioritization",
      "quantitative",
      "structure",
      "synthesis",
    ]);
    v2DrillDefinitions.forEach((definition) => {
      expect(definition).toMatchObject({
        contentVersion: 2,
        eventSchemaVersion: 2,
        scoringVersion: "v2",
      });
      expect(getDrillDefinition(definition.id, 2)).toBe(definition);
      expect(getDrillDefinition(definition.id, 1)).toBeUndefined();
    });
  });
});
