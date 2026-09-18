import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearnerSessionView } from "@/core/learner-case";
import { clearHypothesisPracticeStorage, HypothesisStep } from "./HypothesisStep";

const practice: NonNullable<LearnerSessionView["hypothesis"]> = {
  phase: "update",
  prompt: {
    interactionId: "hypothesis-update",
    responseKind: "hypothesis_update",
    prompt: "Update the hypothesis using revealed evidence.",
    scaffoldingLevel: "beginner",
    guidance: [],
  },
  currentHypothesisId: "revenue-pressure",
  revisionOfResponseId: "hypothesis-1",
};

describe("HypothesisStep", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("requires a generated response before an evidence-linked revision", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<HypothesisStep
      caseId="case-v2"
      practice={practice}
      facts={[{ id: "cost-growth", text: "Costs grew 17%." }]}
      onCommit={vi.fn().mockResolvedValue({
        reveal: {
          criteria: [{ id: "evidence", label: "Links evidence to the update" }],
          comparison: { title: "Example", text: "Revise toward costs." },
          diagnosticRules: [],
        },
        options: [
          { id: "revenue-pressure", label: "Revenue pressure" },
          { id: "cost-pressure", label: "Cost pressure" },
        ],
      })}
      onComplete={onComplete}
    />);

    expect(screen.queryByLabelText("Update decision")).toBeNull();
    await user.type(screen.getByLabelText("Your response"), "Costs grew faster than revenue, so revise the hypothesis.");
    await user.click(screen.getByRole("button", { name: "Commit response" }));
    await user.click(await screen.findByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    await user.click(screen.getByRole("button", { name: "Finish practice" }));

    await user.click(screen.getByLabelText("Costs grew 17%."));
    await user.selectOptions(screen.getByLabelText("Update decision"), "revise");
    await user.selectOptions(screen.getByLabelText("Revised hypothesis"), "cost-pressure");
    await user.click(screen.getByRole("button", { name: "Save hypothesis update" }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      phase: "update",
      status: "revise",
      hypothesisId: "cost-pressure",
      evidenceIds: ["cost-growth"],
      cycle: expect.objectContaining({ phase: "complete" }),
    }));
  });

  it("clears both hypothesis phases when a case attempt restarts", () => {
    window.sessionStorage.setItem(
      "casework:guest-session:case-v2:hypothesis:initial",
      "initial",
    );
    window.sessionStorage.setItem(
      "casework:guest-session:case-v2:hypothesis:update",
      "update",
    );

    clearHypothesisPracticeStorage(window.sessionStorage, "case-v2");

    expect(window.sessionStorage.length).toBe(0);
  });
});
