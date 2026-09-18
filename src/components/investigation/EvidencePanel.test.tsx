import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import { EvidencePanel } from "./EvidencePanel";

const exhibit: LearnerExhibitDefinition = {
  id: "cost-category",
  title: "Cost growth",
  type: "table",
  unit: "$m",
  columns: ["Category", "Growth"],
  rows: [["Labor", 34]],
  series: [],
  categories: [],
  interpretationPrompt: {
    interactionId: "cost-interpretation",
    responseKind: "exhibit_interpretation",
    prompt: "What changed, why does it matter, and what next?",
    scaffoldingLevel: "beginner",
    guidance: ["Start with the strongest comparison."],
  },
};

describe("EvidencePanel V2 interpretation", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("requires generate-first reasoning before revealing and committing an insight", async () => {
    const user = userEvent.setup();
    const onSubmitInterpretation = vi.fn().mockResolvedValue(undefined);
    const onCommitResponse = vi.fn().mockResolvedValue({
      reveal: {
        criteria: [{ id: "comparison", label: "Names the strongest comparison" }],
        comparison: { title: "One example", text: "Labor is the cost outlier." },
        diagnosticRules: [],
      },
      insightOptions: [{ id: "labor-outlier", label: "Labor drove the increase." }],
    });
    render(
      <EvidencePanel
        caseId="alpinefit-profitability"
        facts={[]}
        exhibits={[exhibit]}
        onCommitResponse={onCommitResponse}
        onSubmitInterpretation={onSubmitInterpretation}
      />,
    );

    expect(screen.queryByText("Labor is the cost outlier.")).toBeNull();
    expect(screen.queryByText("Labor drove the increase.")).toBeNull();
    await user.type(screen.getByLabelText("Your response"), "Labor rose fastest.");
    await user.click(screen.getByRole("button", { name: "Commit response" }));
    await screen.findByRole("heading", { name: "Check your response" });
    await user.click(screen.getByLabelText("Names the strongest comparison"));
    await user.click(screen.getByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    expect(await screen.findByText("Labor is the cost outlier.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Finish practice" }));
    await user.selectOptions(
      screen.getByLabelText("Which authored insight best matches your interpretation?"),
      "labor-outlier",
    );
    await user.click(screen.getByRole("button", { name: "Commit interpretation" }));

    await waitFor(() => expect(onSubmitInterpretation).toHaveBeenCalledOnce());
    expect(onSubmitInterpretation.mock.calls[0][0]).toMatchObject({
      exhibitId: "cost-category",
      responses: [{ revision: 1, text: "Labor rose fastest." }],
      insightIds: ["labor-outlier"],
      authoredComparisonViewed: true,
    });
  });
});
