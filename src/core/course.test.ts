import { describe, expect, it } from "vitest";
import { createCourseRegistry } from "@/content/courses";
import { CourseDefinitionSchema } from "./course";

function validCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: "profitability-v3",
    contentVersion: 3,
    status: "active",
    title: "Profitability",
    caseTypeId: "profitability",
    difficulty: "beginner",
    estimatedMinutes: 120,
    steps: [
      {
        id: "overview",
        title: "How profitability cases work",
        resource: { type: "lesson", id: "profitability-overview", contentVersion: 3 },
        completionRule: "viewed",
      },
      {
        id: "clarifying",
        title: "Clarify the decision",
        resource: { type: "activity", id: "alpinefit-clarifying-v3", contentVersion: 3 },
        completionRule: "completed",
      },
      {
        id: "case",
        title: "Complete AlpineFit",
        resource: {
          type: "case",
          id: "alpinefit-profitability",
          contentVersion: 2,
          mode: "practice",
        },
        completionRule: "completed",
      },
    ],
    ...overrides,
  };
}

const resources = {
  getLesson: (id: string, version: number) =>
    id === "profitability-overview" && version === 3 ? { id, version } : undefined,
  getActivity: (id: string, version: number) =>
    id === "alpinefit-clarifying-v3" && version === 3
      ? { id, contentVersion: version, status: "active" as const }
      : undefined,
  getCase: (id: string, version: number) =>
    id === "alpinefit-profitability" && version === 2 ? { id, version } : undefined,
  getCaseMetadata: (id: string, version: number) =>
    id === "alpinefit-profitability" && version === 2
      ? { supportedModes: ["practice"] as const }
      : undefined,
};

describe("CourseDefinitionSchema", () => {
  it("accepts an exact versioned course", () => {
    expect(CourseDefinitionSchema.parse(validCourse())).toMatchObject({
      id: "profitability-v3",
      contentVersion: 3,
      steps: [{ id: "overview" }, { id: "clarifying" }, { id: "case" }],
    });
  });

  it("rejects duplicate steps and mismatched completion rules", () => {
    const course = validCourse();
    expect(CourseDefinitionSchema.safeParse({
      ...course,
      steps: [course.steps[0], course.steps[0]],
    }).success).toBe(false);
    expect(CourseDefinitionSchema.safeParse({
      ...course,
      steps: [{ ...course.steps[0], completionRule: "completed" }],
    }).success).toBe(false);
  });
});

describe("createCourseRegistry", () => {
  it("rejects missing exact resources and unavailable case modes", () => {
    expect(() => createCourseRegistry(
      [validCourse()],
      { "profitability-v3": 3 },
      { ...resources, getLesson: () => undefined },
    )).toThrow(/lesson.*not found/i);
    expect(() => createCourseRegistry(
      [validCourse()],
      { "profitability-v3": 3 },
      { ...resources, getCaseMetadata: () => ({ supportedModes: ["interview"] as const }) },
    )).toThrow(/mode.*not supported/i);
  });

  it("rejects retired activities and retired active course versions", () => {
    expect(() => createCourseRegistry(
      [validCourse()],
      { "profitability-v3": 3 },
      { ...resources, getActivity: () => ({ status: "retired" as const }) },
    )).toThrow(/activity.*retired/i);
    expect(() => createCourseRegistry(
      [validCourse()],
      { "profitability-v3": 3 },
      { ...resources, getActivity: () => ({ status: "draft" as const }) },
    )).toThrow(/activity.*not active/i);
    expect(() => createCourseRegistry(
      [validCourse({ status: "retired" })],
      { "profitability-v3": 3 },
      resources,
    )).toThrow(/cannot be active/i);
  });

  it("resolves a valid exact course", () => {
    const registry = createCourseRegistry(
      [validCourse()],
      { "profitability-v3": 3 },
      resources,
    );
    expect(registry.get("profitability-v3", 3)?.title).toBe("Profitability");
  });
});
