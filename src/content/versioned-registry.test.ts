import { describe, expect, it } from "vitest";
import { createVersionedRegistry } from "./versioned-registry";

describe("versioned content registry", () => {
  const v1 = { id: "same-content", contentVersion: 1, label: "Version one" };
  const v2 = { id: "same-content", contentVersion: 2, label: "Version two" };

  it("resolves two immutable versions of the same ID independently", () => {
    const registry = createVersionedRegistry([v1, v2], {
      "same-content": 2,
    });

    expect(registry.get("same-content", 1)).toEqual(v1);
    expect(registry.get("same-content", 2)).toEqual(v2);
    expect(registry.getActive("same-content")).toEqual(v2);
    expect(Object.isFrozen(registry.get("same-content", 1))).toBe(true);
  });

  it("stops safely for unknown versions without changing active lookup", () => {
    const registry = createVersionedRegistry([v1, v2], {
      "same-content": 2,
    });

    expect(registry.get("same-content", 99)).toBeUndefined();
    expect(registry.getActive("same-content")).toEqual(v2);
  });

  it("rejects duplicate version keys", () => {
    expect(() =>
      createVersionedRegistry([v1, { ...v1, label: "Duplicate" }], {
        "same-content": 1,
      }),
    ).toThrow(/Duplicate content version/);
  });
});
