import { describe, expect, it } from "vitest";
import { CaseDefinitionSchema } from "@/core/schema";
import { assertValidCase } from "@/core/validation";

const caseModules = import.meta.glob("./*.json", {
  eager: true,
  import: "default",
});

describe("case content", () => {
  it("contains validated case definitions", () => {
    expect(Object.keys(caseModules).length).toBeGreaterThan(0);

    Object.entries(caseModules).forEach(([path, content]) => {
      const definition = CaseDefinitionSchema.parse(content);
      expect(() => assertValidCase(definition), path).not.toThrow();
    });
  });
});
