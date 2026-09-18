import { describe, expect, it } from "vitest";
import lessons from "./lessons.json";
import { drillSkillIds, getDrillDefinition, isDrillSkillId } from "./drills";
import clarificationV2 from "./lessons/clarification-v2.json";
import { getLessonDefinition, lessonDefinitions } from "./lessons/index";

type Lesson = {
  id: string;
  kind: "skill" | "pattern";
  title: string;
  summary: string;
  principles: string[];
  example: string;
  skillId: string;
  drillRoute: string;
  contentVersion?: number;
  practice?: { drillId: string; contentVersion: number };
};

const requiredSkillLessons = [
  "structuring",
  "prioritization",
  "quantitative-implication",
  "what-so-what-now-what",
  "synthesis",
];

const requiredPatternLessons = [
  "segmentation",
  "mix-shift",
  "hidden-denominator",
  "bottleneck",
  "math-answer-business-answer",
];

describe("lesson content", () => {
  it("covers every V1 skill and recurring case pattern", () => {
    const typedLessons = lessons as Lesson[];
    const idsByKind = (kind: Lesson["kind"]) =>
      typedLessons
        .filter((lesson) => lesson.kind === kind)
        .map((lesson) => lesson.id)
        .sort();

    expect(idsByKind("skill")).toEqual([...requiredSkillLessons].sort());
    expect(idsByKind("pattern")).toEqual([...requiredPatternLessons].sort());
  });

  it("ends every lesson with a valid matching drill route", () => {
    const typedLessons = lessons as Lesson[];

    expect(typedLessons).toHaveLength(10);
    typedLessons.forEach((lesson) => {
      expect(lesson.title).not.toHaveLength(0);
      expect(lesson.summary).not.toHaveLength(0);
      expect(lesson.principles.length).toBeGreaterThanOrEqual(2);
      expect(lesson.example).not.toHaveLength(0);
      expect(isDrillSkillId(lesson.skillId)).toBe(true);
      expect(lesson.drillRoute).toBe(`/drills/${lesson.skillId}`);
    });

    expect(new Set(lessonDefinitions.map((lesson) => lesson.skillId))).toEqual(new Set(drillSkillIds));
  });

  it("keeps V1 lessons addressable while active lessons bind exact V2 reps", () => {
    const expectedRepIds: Record<string, string> = {
      structuring: "alpinefit-structure-v2",
      prioritization: "alpinefit-prioritization-v2",
      "quantitative-implication": "alpinefit-quantitative-v2",
      "what-so-what-now-what": "alpinefit-exhibit-v2",
      synthesis: "alpinefit-synthesis-v2",
      segmentation: "verdant-structure-v2",
      "mix-shift": "beacon-exhibit-v2",
      "hidden-denominator": "cedarcare-exhibit-v2",
      bottleneck: "quickcart-structure-v2",
      "math-answer-business-answer": "northwind-quantitative-v2",
    };

    for (const lesson of lessons) {
      expect(getLessonDefinition(lesson.id, 1)).toBeDefined();
      expect(getLessonDefinition(lesson.id, 2)).toMatchObject({
        contentVersion: 2,
        practice: { drillId: expectedRepIds[lesson.id], contentVersion: 2 },
      });
      expect(getLessonDefinition(lesson.id, 99)).toBeUndefined();
      expect(getLessonDefinition(lesson.id)).toBe(
        getLessonDefinition(lesson.id, 2),
      );
      const active = getLessonDefinition(lesson.id)! as Lesson;
      expect(getDrillDefinition(active.practice!.drillId, active.practice!.contentVersion))
        .toMatchObject({
          contentVersion: 2,
          ...(lesson.kind === "skill" ? { skillId: lesson.skillId } : {}),
        });
    }
  });

  it("publishes the clarification lesson with an exact V2 rep", () => {
    expect(getLessonDefinition(clarificationV2.id, 2)).toEqual(clarificationV2);
    expect(getLessonDefinition(clarificationV2.id, 1)).toBeUndefined();
    expect(clarificationV2).toMatchObject({
      practice: { drillId: "alpinefit-opening-clarification", contentVersion: 2 },
    });
  });
});

it("publishes the two exact V3 Profitability lessons", () => {
  expect(getLessonDefinition("profitability-overview-v3", 1)?.practice).toEqual({ activityId: "alpinefit-clarifying-v3", contentVersion: 1 });
  expect(getLessonDefinition("profitability-drivers-v3", 1)?.practice).toEqual({ activityId: "alpinefit-brainstorming-v3", contentVersion: 1 });
});
