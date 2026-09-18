import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuantitativeFeedbackPanel } from "@/components/practice/QuantitativeFeedbackPanel";
import { getCaseDefinition } from "@/content/cases";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  projectLearningCyclePrompt,
  revealLearningCycleAfterCommit,
  serializeLearningCycleState,
} from "@/core/learning-cycle";
import type { QuantitativeFeedback } from "@/core/quantitative-feedback";
import type { CommittedResponse } from "@/core/schema";
import { CaseGeneratedStep } from "./CaseGeneratedStep";

const definition = getCaseDefinition("alpinefit-profitability", 2)!;
const calculation = definition.calculations[0];
const authored = calculation.responseCycle!;
const storageKey = `casework:guest-session:${definition.id}:cycle:calculation:${calculation.id}`;

function completedCycle() {
  const response: CommittedResponse = {
    responseId: "calculation-response",
    interactionId: authored.interactionId,
    revision: 1,
    revisionOf: null,
    responseKind: authored.responseKind,
    text: "Six clubs times hours times premium gives the annual expense.",
    committedAtMs: 1,
  };
  let cycle = createLearningCycleState(authored.interactionId);
  cycle = applyLearningCycleAction(cycle, {
    type: "response_committed",
    response,
    reveal: revealLearningCycleAfterCommit(authored, response),
  });
  cycle = applyLearningCycleAction(cycle, {
    type: "self_check_submitted",
    outcomes: authored.criteria.map(({ id }) => ({ criterionId: id, met: true })),
  });
  cycle = applyLearningCycleAction(cycle, { type: "comparison_viewed" });
  return applyLearningCycleAction(cycle, { type: "cycle_completed" });
}

function Harness() {
  const [feedback, setFeedback] = useState<QuantitativeFeedback | null>(null);
  return (
    <>
      <CaseGeneratedStep
        caseId={definition.id}
        contentVersion={definition.version}
        kind="calculation"
        itemId={calculation.id}
        prompt={projectLearningCyclePrompt(authored)}
        events={[]}
        unitOptions={calculation.unitOptions}
        atMs={() => 2}
        onEvent={async () => undefined}
        onQuantitativeFeedback={setFeedback}
      />
      {feedback && <QuantitativeFeedbackPanel feedback={feedback} />}
    </>
  );
}

describe("CaseGeneratedStep", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(storageKey, serializeLearningCycleState(completedCycle()));
    vi.restoreAllMocks();
  });

  it("allows an immediate successful retry after correct arithmetic with the wrong unit", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        checkpoint: { answer: number; unit: string };
      };
      const unitCorrect = body.checkpoint.unit === calculation.unit;
      return new Response(JSON.stringify({
        event: {
          type: "calculation_submitted",
          taskId: calculation.id,
          answer: body.checkpoint.answer,
          unit: body.checkpoint.unit,
        },
        feedback: {
          submittedAnswer: body.checkpoint.answer,
          submittedUnit: body.checkpoint.unit,
          answerCorrect: true,
          unitCorrect,
          correctAnswer: calculation.expectedAnswer,
          correctUnit: calculation.unit,
          explanation: authored.comparison.text,
        },
      }), { status: 200 });
    });

    render(<Harness />);
    await user.type(screen.getByLabelText("Calculated answer"), String(calculation.expectedAnswer));
    await user.click(screen.getByRole("combobox", { name: "Unit" }));
    await user.click(screen.getByRole("option", { name: "%" }));
    await user.click(screen.getByRole("button", { name: "Save calculation" }));

    expect(await screen.findByRole("heading", { name: `Your answer: 756,000 %` })).toBeVisible();
    expect(screen.getByText("Needs correction")).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save calculation" })).toBeEnabled());

    await user.click(screen.getByRole("combobox", { name: "Unit" }));
    await user.click(screen.getByRole("option", { name: "$" }));
    await user.click(screen.getByRole("button", { name: "Save calculation" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Correct756,000 $");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
