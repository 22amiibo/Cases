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
import * as drillContent from ".";

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

  it("publishes exactly three validated V2 reps per trainable skill", () => {
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
    expect(v2DrillDefinitions).toHaveLength(18);
    expect(new Set(v2DrillDefinitions.map(({ id }) => id)).size).toBe(18);
    expect(v2DrillDefinitions.map(({ skillId }) => skillId).sort()).toEqual([
      "clarification",
      "clarification",
      "clarification",
      "exhibit",
      "exhibit",
      "exhibit",
      "prioritization",
      "prioritization",
      "prioritization",
      "quantitative",
      "quantitative",
      "quantitative",
      "structure",
      "structure",
      "structure",
      "synthesis",
      "synthesis",
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

  it("rejects a cosmetically renamed duplicate reasoning template", () => {
    const validateV2DrillSet = Reflect.get(
      drillContent,
      "validateV2DrillSet",
    ) as undefined | ((definitions: typeof v2DrillDefinitions) => unknown);
    expect(validateV2DrillSet).toBeTypeOf("function");

    const original = v2DrillDefinitions.find(
      ({ skillId }) => skillId === "prioritization",
    );
    expect(original).toBeDefined();
    const duplicate = {
      ...original!,
      id: "renamed-prioritization-v2",
      title: "A different title",
      scenario: "A different company with different numbers.",
    };

    expect(() => validateV2DrillSet!([...v2DrillDefinitions, duplicate]))
      .toThrow(/duplicate reasoning template/i);
  });
});
