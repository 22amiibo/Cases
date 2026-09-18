import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InteractionRenderer } from "./InteractionRenderer";

describe("InteractionRenderer", () => {
  it("commits native single and multi select controls", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(<InteractionRenderer interaction={{
      type: "single_select",
      interactionId: "choice",
      prompt: "Choose one",
      options: [{ id: "a", label: "Option A" }, { id: "b", label: "Option B" }],
    }} onCommit={onCommit} disabled={false} />);
    await user.click(screen.getByRole("radio", { name: "Option A" }));
    await user.click(screen.getByRole("button", { name: "Commit answer" }));
    expect(onCommit).toHaveBeenLastCalledWith({
      type: "selection_committed",
      interactionId: "choice",
      selectedIds: ["a"],
    });

    rerender(<InteractionRenderer interaction={{
      type: "multi_select",
      interactionId: "many",
      prompt: "Choose several",
      options: [{ id: "a", label: "Option A" }, { id: "b", label: "Option B" }],
    }} onCommit={onCommit} disabled={false} />);
    await user.click(screen.getByRole("checkbox", { name: "Option A" }));
    await user.click(screen.getByRole("checkbox", { name: "Option B" }));
    await user.click(screen.getByRole("button", { name: "Commit answer" }));
    expect(onCommit).toHaveBeenLastCalledWith({
      type: "selection_committed",
      interactionId: "many",
      selectedIds: ["a", "b"],
    });
  });

  it("reorders ranking choices with keyboard-operable buttons", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InteractionRenderer interaction={{
      type: "ranking",
      interactionId: "rank",
      prompt: "Rank these",
      items: [{ id: "a", label: "Option A" }, { id: "b", label: "Option B" }],
    }} onCommit={onCommit} disabled={false} />);
    await user.click(screen.getByRole("button", { name: "Move Option A down" }));
    await user.click(screen.getByRole("button", { name: "Commit ranking" }));
    expect(onCommit).toHaveBeenCalledWith({
      type: "ranking_committed",
      interactionId: "rank",
      orderedIds: ["b", "a"],
    });
  });

  it("categorizes every item with native selects", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InteractionRenderer interaction={{
      type: "categorization",
      interactionId: "categories",
      prompt: "Categorize",
      categories: [{ id: "high", label: "High" }, { id: "low", label: "Low" }],
      items: [{ id: "question", label: "Question" }],
    }} onCommit={onCommit} disabled={false} />);
    await user.selectOptions(screen.getByLabelText("Question"), "high");
    await user.click(screen.getByRole("button", { name: "Commit categories" }));
    expect(onCommit).toHaveBeenCalledWith({
      type: "categorization_committed",
      interactionId: "categories",
      placements: [{ itemId: "question", categoryId: "high" }],
    });
  });

  it("records selected, placed, and prioritized brainstorm ideas", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InteractionRenderer interaction={{
      type: "brainstorm_builder",
      interactionId: "brainstorm",
      prompt: "Build drivers",
      categories: [{ id: "revenue", label: "Revenue" }, { id: "cost", label: "Cost" }],
      ideas: [{ id: "price", label: "Price" }, { id: "labor", label: "Labor" }],
      maximumPriorityIdeas: 1,
    }} onCommit={onCommit} disabled={false} />);
    await user.click(screen.getByRole("checkbox", { name: "Price" }));
    await user.selectOptions(screen.getByLabelText("Category for Price"), "revenue");
    await user.click(screen.getByRole("checkbox", { name: "Prioritize Price" }));
    await user.click(screen.getByRole("button", { name: "Commit brainstorm" }));
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({
      type: "brainstorm_committed",
      selectedIdeaIds: ["price"],
      priorityIdeaIds: ["price"],
    }));
  });

  it("forms a hypothesis before evidence is revealed", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InteractionRenderer interaction={{
      type: "hypothesis_sequence",
      interactionId: "hypothesis",
      prompt: "Form a claim",
      hypotheses: [{ id: "revenue", label: "Revenue" }, { id: "labor", label: "Labor" }],
      phase: "initial",
      stepId: "initial",
      currentHypothesisId: null,
    }} onCommit={onCommit} disabled={false} />);
    await user.click(screen.getByRole("radio", { name: "Labor" }));
    await user.type(screen.getByLabelText("Rationale"), "Labor may have outgrown revenue.");
    await user.click(screen.getByRole("button", { name: "Commit hypothesis" }));
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({
      type: "hypothesis_committed",
      status: "form",
      hypothesisId: "labor",
      evidenceIds: [],
    }));
  });

  it("renders a visible exhibit table alternative and commits one stage", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InteractionRenderer interaction={{
      type: "exhibit_chain",
      interactionId: "exhibit",
      prompt: "Read it",
      stage: "observe",
      options: [{ id: "labor", label: "Labor is the outlier" }, { id: "all", label: "All equal" }],
    }} exhibit={{
      id: "costs",
      title: "Costs",
      type: "table",
      unit: "$m",
      columns: ["Category", "Current"],
      rows: [["Labor", 24.3]],
      categories: [],
      series: [],
    }} onCommit={onCommit} disabled={false} />);
    expect(screen.getByRole("table", { name: "Costs ($m)" })).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "Labor is the outlier" }));
    await user.type(screen.getByLabelText("Your reasoning"), "Labor rose most.");
    await user.click(screen.getByRole("button", { name: "Commit observe" }));
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({
      type: "exhibit_committed",
      stage: "observe",
      selectedIds: ["labor"],
    }));
  });
});
