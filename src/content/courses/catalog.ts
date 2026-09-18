// Public course references only; safe for browser persistence and progress.
import { createVersionedRegistry } from "@/content/versioned-registry";
import { profitabilityCourse } from "./profitability-v3";
export const courseDefinitions = [profitabilityCourse];
export const activeCourseVersions = Object.freeze({ "profitability-v3": 1 });
const registry = createVersionedRegistry(courseDefinitions, activeCourseVersions, c => c.contentVersion);
export function getCourseDefinition(id: string, version?: number) {
  return version === undefined ? registry.getActive(id) : registry.get(id, version);
}
