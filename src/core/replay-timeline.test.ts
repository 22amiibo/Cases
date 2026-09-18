import { describe, expect, it } from "vitest";
import { getCaseDefinition } from "@/content/cases";
import type { CaseEvent } from "./schema";
import { toLearnerCaseReview } from "./learner-case";
import { buildCaseReplayTimeline } from "./replay-timeline";

const definition = getCaseDefinition("alpinefit-profitability", 2)!;
const recommendation: CaseEvent = {
  type: "recommendation_submitted", decisionId: "staffing", evidenceIds: ["cost-growth"],
  riskId: "service", nextStepId: "pilot", atMs: 1,
};

describe("chronological replay", () => {
  it("never uses later evidence to support an earlier decision, including equal timestamps", () => {
    const timeline = buildCaseReplayTimeline(definition, { events: [
      recommendation,
      { type: "node_investigated", nodeId: "costs", atMs: 1 },
      { ...recommendation, atMs: 2 },
    ] });
    expect(timeline[0].availableEvidence).toEqual([]);
    expect(timeline[0].unavailableEvidenceIds).toEqual(["cost-growth"]);
    expect(timeline[1].revealedEvidence).toEqual([{ id: "cost-growth", text: "Operating costs grew 17%, substantially faster than revenue.", eventNumber: 2 }, expect.objectContaining({ id: "exhibit:cost-category", eventNumber: 2 })]);
    expect(timeline[2].availableEvidence.map(({ id }) => id)).toEqual(["cost-growth", "exhibit:cost-category"]);
    expect(timeline[2].unavailableEvidenceIds).toEqual([]);
    expect(timeline[0].nextDecision).toBe(timeline[1].decision);
  });

  it.each([1, 2])("preserves version %i exhibits at their reveal without advancing later facts or exhibits", (version) => {
    const historical = getCaseDefinition("alpinefit-profitability", version)!;
    const timeline = buildCaseReplayTimeline(historical, { events: [
      { type: "node_investigated", nodeId: "costs", atMs: 1 },
      { type: "exhibit_interpretation_submitted", exhibitId: "cost-category", atMs: 1,
        eventSchemaVersion: 2, authoredComparisonViewed: false, insightIds: [], rubricOutcomes: [], diagnostics: [],
        responses: [{ responseId: "interpretation-1", interactionId: "cost-interpretation", revision: 1, revisionOf: null,
          responseKind: "exhibit_interpretation", text: "Labor increased faster than occupancy.", committedAtMs: 1 }],
      },
      { type: "node_investigated", nodeId: "variable_cost", atMs: 2 },
      { type: "node_investigated", nodeId: "labor", atMs: 3 },
      { type: "node_investigated", nodeId: "overtime", atMs: 4 },
    ] });
    expect(timeline[0].availableEvidence).toEqual([]);
    const exhibit = timeline[0].revealedEvidence.find(({ id }) => id === "exhibit:cost-category");
    expect(exhibit).toMatchObject({ eventNumber: 1, exhibit: {
      id: "cost-category", title: "Operating cost by category", type: "grouped_bar", unit: "$m",
      columns: ["Category", "Prior year", "Current year"],
      rows: [["Club labor", 18.1, 24.3], ["Occupancy", 15.2, 15.6], ["Amenities", 4.7, 5.1], ["Corporate", 5.3, 5.5]],
      categories: ["Club labor", "Occupancy", "Amenities", "Corporate"],
      series: [{ name: "Prior year", data: [18.1, 15.2, 4.7, 5.3] }, { name: "Current year", data: [24.3, 15.6, 5.1, 5.5] }],
    } });
    expect(timeline[1].availableEvidence.map(({ id }) => id)).toEqual(["cost-growth", "exhibit:cost-category"]);
    expect(timeline[1].availableEvidence).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "labor-growth" })]));
    expect(timeline[1].availableEvidence).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "exhibit:location-turnover" })]));
    expect(timeline[4].revealedEvidence.some(({ id }) => id === "exhibit:location-turnover")).toBe(true);
    expect(exhibit?.exhibit).not.toHaveProperty("sourceFactIds");
    expect(exhibit?.exhibit).not.toHaveProperty("insights");
    expect(exhibit?.exhibit).not.toHaveProperty("interpretation");
    expect(exhibit?.exhibit).not.toHaveProperty("interpretationPrompt");
  });

  it("keeps exact-version clarification context available only after its answer", () => {
    const historical = getCaseDefinition("alpinefit-profitability", 1)!;
    const timeline = buildCaseReplayTimeline(historical, { events: [
      { type: "clarification_selected", clarificationId: "target-metric", atMs: 1 },
      { ...recommendation, atMs: 2 },
    ] });
    expect(timeline[0].availableEvidence).toEqual([]);
    expect(timeline[1].availableEvidence).toEqual([{
      id: "clarification:target-metric", eventNumber: 1,
      text: "Focus on the six-point decline in EBITDA margin, not absolute revenue growth.",
    }]);
  });

  it("preserves repeated calculations and only reveals successful practice results", () => {
    const taskId = definition.calculations[0].id;
    const events: CaseEvent[] = [
      { type: "calculation_submitted", taskId, answer: 5, atMs: 1 },
      { type: "calculation_submitted", taskId, answer: 756000, atMs: 2 },
      { ...recommendation, atMs: 3 },
    ];
    const timeline = buildCaseReplayTimeline(definition, { events });
    expect(timeline.map(({ eventNumber }) => eventNumber)).toEqual([1, 2, 3]);
    expect(timeline[0].revealedEvidence).toEqual([]);
    expect(timeline[1].availableEvidence).toEqual([]);
    expect(timeline[1].revealedEvidence[0].id).toBe("incremental-labor");
    expect(timeline[2].availableEvidence[0].id).toBe("incremental-labor");
    const interview = buildCaseReplayTimeline(definition, { events, caseMode: "interview" });
    expect(interview[0].revealedEvidence[0].id).toBe("incremental-labor");
    expect(interview[1].availableEvidence[0].text).not.toContain("756,000");
    expect(interview[1].availableEvidence[0].text).toContain("Your submitted calculation: 5");
  });

  it("flags a subsequent decision made after contrary evidence without a hypothesis update", () => {
    const events: CaseEvent[] = [
      { type: "hypothesis_selected", hypothesisId: "revenue-economics", atMs: 1 },
      { type: "node_investigated", nodeId: "costs", atMs: 2 },
      { ...recommendation, atMs: 3 },
    ];
    const timeline = buildCaseReplayTimeline(definition, { events });
    expect(timeline[1].contraryEvidenceWithoutUpdate).toEqual([]);
    expect(timeline[2].contraryEvidenceWithoutUpdate.map(({ id, eventNumber }) => ({ id, eventNumber })))
      .toEqual([{ id: "cost-growth", eventNumber: 2 }]);
    expect(toLearnerCaseReview(definition, events).timeline).toEqual(timeline);
  });

  it("preserves learner response revisions and labels self-assessment separately from objective diagnostics", () => {
    const event: CaseEvent = {
      type: "calculation_submitted", taskId: definition.calculations[0].id, answer: 5, unit: "$", atMs: 3,
      eventSchemaVersion: 2, authoredComparisonViewed: true,
      responses: [1, 2].map((revision) => ({
        responseId: `r${revision}`, interactionId: "math", revision,
        revisionOf: revision === 1 ? null : "r1", responseKind: "calculation", text: `My reasoning ${revision}`, committedAtMs: revision,
      })), rubricOutcomes: [], diagnostics: [
        { code: "sense_check_missing", source: "self_assessment", severity: "coaching", responseId: "r2" },
        { code: "arithmetic_error", source: "system", severity: "blocking", responseId: "r2" },
      ],
    };
    const entry = buildCaseReplayTimeline(definition, { events: [event] })[0];
    expect(entry.responses.map(({ text }) => text)).toEqual(["My reasoning 1", "My reasoning 2"]);
    expect(entry.diagnostics).toEqual(event.diagnostics);
    expect(entry.decision).toContain("5 $");
  });
});
