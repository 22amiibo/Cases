import { describe, expect, it } from "vitest";
import {
  diagnosticCodes,
  diagnosticDefinitions,
} from "./diagnostics";

describe("diagnostic taxonomy", () => {
  it("provides authored metadata for every stable code", () => {
    expect(Object.keys(diagnosticDefinitions)).toHaveLength(diagnosticCodes.length);
    for (const code of diagnosticCodes) {
      expect(diagnosticDefinitions[code]).toMatchObject({ code });
      expect(diagnosticDefinitions[code].explanation.length).toBeGreaterThan(0);
      expect(diagnosticDefinitions[code].recommendedNextRep.length).toBeGreaterThan(0);
    }
  });

  it("does not publish duplicate stable codes", () => {
    expect(new Set(diagnosticCodes).size).toBe(diagnosticCodes.length);
  });
});
