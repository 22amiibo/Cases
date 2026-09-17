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
};

export const lessonDefinitions = [
  ...(lessonContent as LessonDefinition[]),
  clarificationV2Content as LessonDefinition,
];
export const activeLessonVersions = Object.freeze(
  Object.fromEntries(
    lessonDefinitions.map(({ id, contentVersion }) => [id, contentVersion ?? 1]),
  ),
) as Readonly<Record<string, number>>;
const lessonRegistry = createVersionedRegistry(
  lessonDefinitions,
  activeLessonVersions,
  (lesson) => lesson.contentVersion ?? 1,
);

export function getLessonDefinition(id: string, contentVersion?: number) {
  return contentVersion === undefined
    ? lessonRegistry.getActive(id)
    : lessonRegistry.get(id, contentVersion);
}
