import { createVersionedRegistry } from "@/content/versioned-registry";
import { CourseDefinitionSchema, type CourseDefinition } from "@/core/course";
import { getActivityDefinition } from "@/content/activities";
import { getCaseDefinition } from "@/content/cases";
import { getCaseMetadata } from "@/content/cases/metadata";
import { getLessonDefinition } from "@/content/lessons";

export type CourseResourceResolvers = {
  getLesson(id: string, contentVersion: number): unknown;
  getActivity(id: string, contentVersion: number):
    | { status?: "draft" | "active" | "retired" }
    | undefined;
  getCase(id: string, contentVersion: number): unknown;
  getCaseMetadata(id: string, contentVersion: number):
    | { supportedModes: readonly string[] }
    | undefined;
};

export function createCourseRegistry(
  definitions: unknown[],
  activeVersions: Readonly<Record<string, number>>,
  resources: CourseResourceResolvers,
) {
  const parsed = definitions.map((definition) => CourseDefinitionSchema.parse(definition));
  for (const course of parsed) {
    for (const step of course.steps) {
      const { resource } = step;
      if (resource.type === "lesson") {
        if (!resources.getLesson(resource.id, resource.contentVersion)) {
          throw new Error(`Course lesson not found: ${resource.id}:${resource.contentVersion}`);
        }
      } else if (resource.type === "activity") {
        const activity = resources.getActivity(resource.id, resource.contentVersion);
        if (!activity) {
          throw new Error(`Course activity not found: ${resource.id}:${resource.contentVersion}`);
        }
        if (activity.status !== "active") {
          throw new Error(
            activity.status === "retired"
              ? `Course activity is retired: ${resource.id}:${resource.contentVersion}`
              : `Course activity is not active: ${resource.id}:${resource.contentVersion}`,
          );
        }
      } else {
        if (!resources.getCase(resource.id, resource.contentVersion)) {
          throw new Error(`Course case not found: ${resource.id}:${resource.contentVersion}`);
        }
        const metadata = resources.getCaseMetadata(resource.id, resource.contentVersion);
        if (!metadata?.supportedModes.includes(resource.mode)) {
          throw new Error(`Course case mode is not supported: ${resource.id}:${resource.mode}`);
        }
      }
    }
  }
  const registry = createVersionedRegistry(
    parsed,
    activeVersions,
    ({ contentVersion }) => contentVersion,
  );
  for (const [id, contentVersion] of Object.entries(activeVersions)) {
    if (registry.get(id, contentVersion)?.status !== "active") {
      throw new Error(`Retired or draft course cannot be active: ${id}:${contentVersion}`);
    }
  }
  return registry;
}

export const courseDefinitions: CourseDefinition[] = [];
export const activeCourseVersions = Object.freeze({}) as Readonly<Record<string, number>>;
const courseRegistry = createCourseRegistry(
  courseDefinitions,
  activeCourseVersions,
  {
    getLesson: getLessonDefinition,
    getActivity: getActivityDefinition,
    getCase: getCaseDefinition,
    getCaseMetadata,
  },
);

export function getCourseDefinition(id: string, contentVersion?: number) {
  return contentVersion === undefined
    ? courseRegistry.getActive(id)
    : courseRegistry.get(id, contentVersion);
}
