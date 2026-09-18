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
});
