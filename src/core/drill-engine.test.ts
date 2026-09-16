import { describe, expect, it } from "vitest";
import { DrillDefinitionSchema } from "./schema";
import { evaluateDrill } from "./drill-engine";

describe("evaluateDrill", () => {
  it("evaluates structure coverage and priority", () => {
    const definition = DrillDefinitionSchema.parse({
      id: "structure-1",
      skillId: "structure",
      prompt: "Structure a profit decline.",
      conceptIdsPracticed: ["revenue", "variable_cost"],
      conceptOptions: [
        { id: "revenue", label: "Revenue" },
        { id: "variable_cost", label: "Variable cost" },
      ],
      rubric: {
        concepts: [
          { conceptId: "revenue", weight: 1, required: true },
          { conceptId: "variable_cost", weight: 1, required: true },
        ],
        overlapGroups: [],
        priorityConceptIds: ["variable_cost"],
      },
    });

    const result = evaluateDrill(definition, {
      branches: [
        { conceptId: "revenue", children: [] },
        { conceptId: "variable_cost", children: [] },
      ],
      priorityConceptId: "variable_cost",
    });

    expect(result.pointsEarned).toBe(100);
    expect(result.feedbackCode).toBe("complete_structure");
  });

  it("allows multiple weighted prioritization answers", () => {
    const definition = DrillDefinitionSchema.parse({
      id: "prioritization-1",
      skillId: "prioritization",
      prompt: "Where would you start?",
      conceptIdsPracticed: ["revenue", "variable_cost"],
      options: [
        { id: "costs", label: "Costs", weight: 1 },
        { id: "revenue", label: "Revenue", weight: 0.8 },
        { id: "branding", label: "Branding", weight: 0 },
      ],
    });

    expect(evaluateDrill(definition, { optionId: "revenue" }).pointsEarned).toBe(
      80,
    );
  });

  it("requires both a correct numeric answer and unit", () => {
    const definition = DrillDefinitionSchema.parse({
      id: "quantitative-1",
      skillId: "quantitative",
      prompt: "Calculate contribution.",
      conceptIdsPracticed: ["variable_cost"],
      expectedAnswer: 25,
      tolerance: 0.1,
      requiredUnit: "$m",
    });

    expect(
      evaluateDrill(definition, { answer: 25.05, unit: "$m" }).pointsEarned,
    ).toBe(100);
    expect(
      evaluateDrill(definition, { answer: 25.05, unit: "%" }).pointsEarned,
    ).toBe(0);
  });

  it("scores exhibit What, So what, and Now what independently", () => {
    const definition = DrillDefinitionSchema.parse({
      id: "exhibit-1",
      skillId: "exhibit",
      prompt: "Interpret the exhibit.",
      conceptIdsPracticed: ["volume"],
      exhibit: {
        id: "volume-chart",
        title: "Volume",
        type: "line",
        unit: "units",
        sourceFactIds: ["volume-fact"],
        columns: [],
        rows: [],
        categories: ["Q1", "Q2"],
        series: [{ name: "Volume", data: [10, 6] }],
        insights: [{ id: "decline", label: "Volume declined.", strength: 1 }],
      },
      observationOptions: [
        { id: "down", label: "Volume fell." },
        { id: "up", label: "Volume rose." },
      ],
      implicationOptions: [
        { id: "profit", label: "Profit is pressured." },
        { id: "none", label: "No implication." },
      ],
      nextInvestigationOptions: [
        { id: "segments", label: "Check segments." },
        { id: "rent", label: "Check rent." },
      ],
      correct: {
        observationId: "down",
        implicationId: "profit",
        nextInvestigationId: "segments",
      },
    });

    const result = evaluateDrill(definition, {
      observationId: "down",
      implicationId: "none",
      nextInvestigationId: "segments",
    });

    expect(result.pointsEarned).toBe(67);
  });

  it("scores two synthesis evidence choices and a next step", () => {
    const definition = DrillDefinitionSchema.parse({
      id: "synthesis-1",
      skillId: "synthesis",
      prompt: "Choose decision-relevant evidence.",
      conceptIdsPracticed: ["labor"],
      evidenceOptions: [
        { id: "labor-up", label: "Labor rose." },
        { id: "turnover-up", label: "Turnover rose." },
        { id: "rent-flat", label: "Rent is flat." },
      ],
      correctEvidenceIds: ["labor-up", "turnover-up"],
      nextStepOptions: [
        { id: "retention-pilot", label: "Pilot retention." },
        { id: "rent-audit", label: "Audit rent." },
      ],
      correctNextStepId: "retention-pilot",
    });

    const result = evaluateDrill(definition, {
      evidenceIds: ["labor-up", "turnover-up"],
      nextStepId: "retention-pilot",
    });

    expect(result.pointsEarned).toBe(100);
    expect(result.feedbackCode).toBe("strong_synthesis");
  });
});
