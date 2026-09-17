import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecommendationBuilder } from "./RecommendationBuilder";

const recommendation = {
  decisions: [
    { id: "stabilize-staffing", label: "Stabilize staffing." },
  ],
  risks: [{ id: "retention-cost", label: "Retention costs may persist." }],
  nextSteps: [{ id: "six-club-pilot", label: "Run a six-club pilot." }],
};

describe("RecommendationBuilder", () => {
  it("only lets learners cite evidence they have discovered", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RecommendationBuilder
        recommendation={recommendation}
        facts={[{ id: "overtime-spike", text: "Overtime nearly tripled." }]}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("Overtime nearly tripled.")).toBeVisible();
    expect(screen.queryByLabelText(/turnover/i)).toBeNull();

    await user.selectOptions(
      screen.getByLabelText("Recommendation"),
      "stabilize-staffing",
    );
    await user.click(screen.getByLabelText("Overtime nearly tripled."));
    await user.selectOptions(screen.getByLabelText("Risk to manage"), "retention-cost");
    await user.selectOptions(
      screen.getByLabelText("First next step"),
      "six-club-pilot",
    );
    await user.click(screen.getByRole("button", { name: "Submit recommendation" }));

    expect(onSubmit).toHaveBeenCalledWith({
      decisionId: "stabilize-staffing",
      evidenceIds: ["overtime-spike"],
      riskId: "retention-cost",
      nextStepId: "six-club-pilot",
    });
  });

  it("shows a retryable error and prevents duplicate submits while pending", async () => {
    const user = userEvent.setup();
    let rejectSubmission: (reason?: unknown) => void = () => undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSubmission = reject;
        }),
    );

    render(
      <RecommendationBuilder
        recommendation={recommendation}
        facts={[{ id: "overtime-spike", text: "Overtime nearly tripled." }]}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Recommendation"), "stabilize-staffing");
    await user.click(screen.getByLabelText("Overtime nearly tripled."));
    await user.selectOptions(screen.getByLabelText("Risk to manage"), "retention-cost");
    await user.selectOptions(screen.getByLabelText("First next step"), "six-club-pilot");
    await user.click(screen.getByRole("button", { name: "Submit recommendation" }));

    expect(screen.getByRole("button", { name: "Submitting recommendation" })).toBeDisabled();
    rejectSubmission(new Error("offline"));
    expect(
      await screen.findByText("We could not save your recommendation. Try again."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
