import type { CourseDefinition } from "@/core/course";

export const profitabilityCourse: CourseDefinition = {
  id: "profitability-v3", contentVersion: 1, status: "active", title: "Profitability",
  caseTypeId: "profitability", difficulty: "beginner", estimatedMinutes: 75,
  steps: [
    { id: "overview", title: "How profitability cases work", resource: { type: "lesson", id: "profitability-overview-v3", contentVersion: 1 }, completionRule: "viewed" },
    { id: "drivers", title: "Revenue and cost drivers", resource: { type: "lesson", id: "profitability-drivers-v3", contentVersion: 1 }, completionRule: "viewed" },
    { id: "clarifying", title: "Clarify the profit question", resource: { type: "activity", id: "alpinefit-clarifying-v3", contentVersion: 1 }, completionRule: "completed" },
    { id: "brainstorming", title: "Generate profit explanations", resource: { type: "activity", id: "alpinefit-brainstorming-v3", contentVersion: 1 }, completionRule: "completed" },
    { id: "structuring", title: "Structure the investigation", resource: { type: "lesson", id: "structuring", contentVersion: 2 }, completionRule: "viewed" },
    { id: "quantitative", title: "Turn math into a business implication", resource: { type: "lesson", id: "quantitative-implication", contentVersion: 2 }, completionRule: "viewed" },
    { id: "exhibit", title: "Interpret AlpineFit's evidence", resource: { type: "activity", id: "alpinefit-exhibit-v3", contentVersion: 1 }, completionRule: "completed" },
    { id: "hypothesis", title: "Update your profit hypothesis", resource: { type: "activity", id: "alpinefit-hypothesis-v3", contentVersion: 1 }, completionRule: "completed" },
    { id: "case", title: "Apply it in AlpineFit", resource: { type: "case", id: "alpinefit-profitability", contentVersion: 2, mode: "practice" }, completionRule: "completed" },
  ],
};
