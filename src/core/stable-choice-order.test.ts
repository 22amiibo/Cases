import { describe, expect, it } from "vitest";
import { stableChoiceOrder } from "./stable-choice-order";

const choices = [
  { id: "correct", label: "Correct" },
  { id: "distractor-a", label: "Distractor A" },
  { id: "distractor-b", label: "Distractor B" },
  { id: "distractor-c", label: "Distractor C" },
];

describe("stableChoiceOrder", () => {
  it("keeps IDs intact and returns the same order for the same session seed", () => {
    const first = stableChoiceOrder(choices, "attempt-a", "checkpoint");
    const restored = stableChoiceOrder(choices, "attempt-a", "checkpoint");

    expect(restored.map(({ id }) => id)).toEqual(first.map(({ id }) => id));
    expect(new Set(first.map(({ id }) => id))).toEqual(new Set(choices.map(({ id }) => id)));
  });

  it("can produce a different order for another session without mutating authored choices", () => {
    const original = choices.map(({ id }) => id);
    const first = stableChoiceOrder(choices, "attempt-a", "checkpoint");
    const second = stableChoiceOrder(choices, "attempt-b", "checkpoint");

    expect(second.map(({ id }) => id)).not.toEqual(first.map(({ id }) => id));
    expect(choices.map(({ id }) => id)).toEqual(original);
  });
});
