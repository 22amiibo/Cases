import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningCycleReveal } from "@/core/learning-cycle";
import { GeneratedResponseCycle } from "./GeneratedResponseCycle";

const prompt = {
  interactionId: "exhibit-cycle-1",
  responseKind: "exhibit_interpretation",
  prompt: "Explain what changed, why it matters, and what you would test next.",
  scaffoldingLevel: "beginner" as const,
  guidance: ["State the observation before the implication."],
};

const reveal: LearningCycleReveal = {
  criteria: [
    { id: "observation", label: "Names the strongest comparison accurately" },
    { id: "implication", label: "Explains why the comparison matters" },
  ],
  comparison: {
    title: "One defensible interpretation",
    text: "Labor growth is the clearest outlier and warrants a location comparison.",
  },
  diagnosticRules: [
    {
      criterionId: "observation",
      when: "not_met",
      code: "comparison_missed",
      severity: "coaching",
    },
  ],
};

describe("GeneratedResponseCycle", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("commits before reveal, supports self-check, and moves focus accessibly", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockResolvedValue(reveal);
    render(
      <GeneratedResponseCycle
        prompt={prompt}
        onCommit={onCommit}
        createResponseId={() => "response-1"}
        now={() => 100}
      />,
    );

    expect(screen.queryByText(reveal.comparison.text)).toBeNull();
    expect(screen.queryByText(reveal.criteria[0].label)).toBeNull();
    await user.type(screen.getByLabelText("Your response"), "Labor is the outlier.");
    await user.click(screen.getByRole("button", { name: "Commit response" }));

    await waitFor(() =>
      expect(onCommit).toHaveBeenCalledWith({
        responseId: "response-1",
        interactionId: prompt.interactionId,
        revision: 1,
        revisionOf: null,
        responseKind: prompt.responseKind,
        text: "Labor is the outlier.",
        committedAtMs: 100,
      }),
    );
    expect(JSON.stringify(onCommit.mock.calls)).not.toContain(
      reveal.comparison.text,
    );
    expect(JSON.stringify(onCommit.mock.calls)).not.toContain(
      reveal.criteria[0].label,
    );
    const selfCheckHeading = await screen.findByRole("heading", {
      name: "Check your response",
    });
    expect(selfCheckHeading).toHaveFocus();
    expect(screen.queryByText(reveal.comparison.text)).toBeNull();

    await user.click(screen.getByLabelText(reveal.criteria[1].label));
    await user.click(screen.getByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));

    expect(await screen.findByText(reveal.comparison.text)).toBeVisible();
    expect(screen.getByText(/comparison missed/i)).toBeVisible();
  });

  it("restores two linked revisions while leaving uncommitted text out of storage", async () => {
    const user = userEvent.setup();
    let responseNumber = 0;
    const firstRender = render(
      <GeneratedResponseCycle
        prompt={prompt}
        onCommit={vi.fn().mockResolvedValue(reveal)}
        createResponseId={() => `response-${++responseNumber}`}
        now={() => responseNumber * 100}
        storageKey="learning-cycle:test"
      />,
    );

    await user.type(screen.getByLabelText("Your response"), "First response");
    await user.click(screen.getByRole("button", { name: "Commit response" }));
    await screen.findByRole("heading", { name: "Check your response" });
    await user.click(screen.getByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    await user.click(screen.getByRole("button", { name: "Try another response" }));
    await user.type(screen.getByLabelText("Your revised response"), "Second response");
    expect(window.sessionStorage.getItem("learning-cycle:test")).not.toContain(
      "Second response",
    );
    await user.click(screen.getByRole("button", { name: "Commit revision" }));
    await screen.findByRole("heading", { name: "Check your response" });

    firstRender.unmount();
    const onComplete = vi.fn(() => {
      expect(
        JSON.parse(
          window.sessionStorage.getItem("learning-cycle:test") ?? "null",
        ).phase,
      ).toBe("complete");
    });
    render(
      <GeneratedResponseCycle
        prompt={prompt}
        onCommit={vi.fn().mockResolvedValue(reveal)}
        createResponseId={() => "response-3"}
        now={() => 300}
        storageKey="learning-cycle:test"
        onComplete={onComplete}
      />,
    );

    expect(await screen.findByText("Revision 2 of 2")).toBeVisible();
    expect(window.sessionStorage.getItem("learning-cycle:test")).toContain(
      "Second response",
    );
    await user.click(screen.getByRole("button", { name: "Save self-check" }));
    await user.click(screen.getByRole("button", { name: "View comparison" }));
    await user.click(screen.getByRole("button", { name: "Finish practice" }));
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
