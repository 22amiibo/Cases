import { describe, expect, it } from "vitest";
import type { FrameworkRubricSchema, FrameworkSubmission } from "./schema";
import type { z } from "zod";
import { scoreFramework } from "./framework-scoring";

type Rubric = z.infer<typeof FrameworkRubricSchema>;

const rubric: Rubric = {
  concepts: [
    { conceptId: "revenue", weight: 1, required: true },
    { conceptId: "fixed_cost", weight: 1, required: true },
    { conceptId: "variable_cost", weight: 2, required: true },
  ],
  overlapGroups: [["fixed_cost", "variable_cost"]],
  priorityConceptIds: ["variable_cost"],
};

function submission(
  conceptIds: string[],
  priorityConceptId = conceptIds[0],
): FrameworkSubmission {
  return {
    branches: conceptIds.map((conceptId) => ({ conceptId, children: [] })),
    priorityConceptId,
  };
}

describe("scoreFramework", () => {
  it("awards full coverage for every weighted concept", () => {
    const result = scoreFramework(
      submission(["revenue", "fixed_cost", "variable_cost"], "variable_cost"),
      rubric,
    );

    expect(result.coverage).toBe(1);
    expect(result.missedConceptIds).toEqual([]);
  });

  it("identifies a missing required branch", () => {
    const result = scoreFramework(submission(["revenue", "fixed_cost"]), rubric);

    expect(result.coverage).toBe(0.5);
    expect(result.missedConceptIds).toEqual(["variable_cost"]);
  });

  it("penalizes duplicate and overlapping concepts", () => {
    const result = scoreFramework(
      submission(["revenue", "fixed_cost", "variable_cost", "variable_cost"]),
      rubric,
    );

    expect(result.overlapPenalty).toBe(0.2);
  });

  it("rewards starting with a high-priority branch", () => {
    expect(
      scoreFramework(submission(["revenue", "variable_cost"], "variable_cost"), rubric)
        .priorityScore,
    ).toBe(1);
    expect(
      scoreFramework(submission(["revenue", "variable_cost"], "revenue"), rubric)
        .priorityScore,
    ).toBe(0);
  });
});
