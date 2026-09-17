import { describe, expect, it } from "vitest";
import { clarificationV2Definition as definition } from "@/content/drills";
import {
  evaluateClarificationQuestions,
  projectClarificationDrill,
  revealClarificationAfterCommit,
} from "./clarification-drill";

const response = {
  responseId: "opening-1",
  interactionId: definition.responseCycle.interactionId,
  revision: 1,
  revisionOf: null,
  responseKind: definition.responseCycle.responseKind,
  text: "Find the drivers of margin decline and actions to restore profit.",
  committedAtMs: 1,
};

describe("V2 clarification drill", () => {
  it("projects no rubric, comparison, question answer, or relevance flag before commitment", () => {
    const serialized = JSON.stringify(projectClarificationDrill(definition));
    expect(serialized).not.toContain(definition.responseCycle.comparison.text);
    expect(serialized).not.toContain(definition.responseCycle.criteria[0].label);
    expect(serialized).not.toContain(definition.questionOptions[0].response);
    expect(serialized).not.toContain("highValue");
  });

  it("reveals safe question labels only after commitment", () => {
    const revealed = revealClarificationAfterCommit(definition, response);
    expect(revealed.questionOptions).toEqual(
      definition.questionOptions.map(({ id, label }) => ({ id, label })),
    );
    expect(JSON.stringify(revealed.questionOptions)).not.toContain("response");
  });

  it("returns every selected authored response and strong-opening evidence", () => {
    const result = evaluateClarificationQuestions(
      definition,
      ["metric-definition", "time-period", "decision-constraints"],
      response.responseId,
    );
    expect(result.responses).toHaveLength(3);
    expect(result.responses.map(({ response }) => response)).toEqual([
      definition.questionOptions[0].response,
      definition.questionOptions[1].response,
      definition.questionOptions[2].response,
    ]);
    expect(result.diagnostics.map(({ code }) => code)).toEqual(["strong_opening"]);
  });

  it("diagnoses low-value selection and overload independently", () => {
    expect(
      evaluateClarificationQuestions(
        definition,
        ["metric-definition", "logo-color"],
        response.responseId,
      ).diagnostics.map(({ code }) => code),
    ).toContain("low_value_question");
    expect(
      evaluateClarificationQuestions(
        definition,
        ["metric-definition", "time-period", "decision-constraints", "logo-color"],
        response.responseId,
      ).diagnostics.map(({ code }) => code),
    ).toEqual(expect.arrayContaining(["low_value_question", "question_overload"]));
  });
});
