import { describe, expect, it } from "vitest";
import lessons from "./lessons.json";
import { drillSkillIds, isDrillSkillId } from "./drills";
import { getLessonDefinition } from "./lessons/index";

type Lesson = {
  id: string;
  kind: "skill" | "pattern";
  title: string;
  summary: string;
  principles: string[];
  example: string;
  skillId: string;
  drillRoute: string;
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

    expect(new Set(typedLessons.map((lesson) => lesson.skillId))).toEqual(
      new Set(drillSkillIds),
    );
  });

  it("resolves V1 lessons by explicit historical version", () => {
    for (const lesson of lessons) {
      expect(getLessonDefinition(lesson.id, 1)).toBeDefined();
      expect(getLessonDefinition(lesson.id, 99)).toBeUndefined();
      expect(getLessonDefinition(lesson.id)).toBe(
        getLessonDefinition(lesson.id, 1),
      );
    }
  });
});
