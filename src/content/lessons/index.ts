import overviewV3 from "./profitability-overview-v3.json";
import driversV3 from "./profitability-drivers-v3.json";
import lessonContent from "../lessons.json";
import clarificationV2Content from "./clarification-v2.json";
import { createVersionedRegistry } from "../versioned-registry";

export type LessonDefinition = {
  id: string;
  kind: "skill" | "pattern";
  title: string;
  summary: string;
  principles: string[];
  example: string;
  skillId: string;
  drillRoute: string;
  contentVersion?: number;
  practice?: { drillId: string; contentVersion: 2 } | { activityId: string; contentVersion: number };
};

const legacyLessons = lessonContent as LessonDefinition[];
const practiceByLessonId: Record<string, string> = {
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
const patternPracticeSkills: Record<string, string> = {
  segmentation: "structure",
  "mix-shift": "exhibit",
  "hidden-denominator": "exhibit",
  bottleneck: "structure",
  "math-answer-business-answer": "quantitative",
};
const v2Lessons = legacyLessons.map((lesson): LessonDefinition => {
  const drillId = practiceByLessonId[lesson.id];
  const practiceSkillId = patternPracticeSkills[lesson.id] ?? lesson.skillId;
  return {
    ...lesson,
    contentVersion: 2,
    practice: { drillId, contentVersion: 2 },
    drillRoute: `/drills/${practiceSkillId}?rep=${drillId}`,
  };
});

export const lessonDefinitions = [
  ...v2Lessons,
  overviewV3 as LessonDefinition,
  driversV3 as LessonDefinition,
  clarificationV2Content as LessonDefinition,
];
export const activeLessonVersions = Object.freeze(
  Object.fromEntries(
    lessonDefinitions.map(({ id, contentVersion }) => [id, contentVersion ?? 1]),
  ),
) as Readonly<Record<string, number>>;
const lessonRegistry = createVersionedRegistry(
  [...legacyLessons, ...lessonDefinitions],
  activeLessonVersions,
  (lesson) => lesson.contentVersion ?? 1,
);

export function getLessonDefinition(id: string, contentVersion?: number) {
  return contentVersion === undefined
    ? lessonRegistry.getActive(id)
    : lessonRegistry.get(id, contentVersion);
}
