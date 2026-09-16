import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FrameworkBuilder } from "./FrameworkBuilder";

const concepts = [
  { id: "revenue", label: "Revenue", aliases: ["sales"] },
  { id: "fixed_cost", label: "Fixed cost", aliases: ["overhead"] },
  { id: "variable_cost", label: "Variable cost", aliases: ["unit cost"] },
];

describe("FrameworkBuilder", () => {
  it("adds and removes canonical concepts", async () => {
    const user = userEvent.setup();
    render(<FrameworkBuilder concepts={concepts} onSubmit={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Concept to add"), "revenue");
    await user.click(screen.getByRole("button", { name: "Add branch" }));
    expect(screen.getByRole("heading", { name: "Revenue" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Remove Revenue" }));
    expect(screen.queryByRole("heading", { name: "Revenue" })).toBeNull();
  });

  it("submits only canonical IDs and the selected priority", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FrameworkBuilder concepts={concepts} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Concept to add"), "revenue");
    await user.click(screen.getByRole("button", { name: "Add branch" }));
    await user.selectOptions(
      screen.getByLabelText("Concept to add"),
      "variable_cost",
    );
    await user.click(screen.getByRole("button", { name: "Add branch" }));
    await user.click(
      screen.getByRole("button", { name: "Start with Variable cost" }),
    );
    await user.click(screen.getByRole("button", { name: "Submit framework" }));

    expect(onSubmit).toHaveBeenCalledWith({
      branches: [
        { conceptId: "revenue", children: [] },
        { conceptId: "variable_cost", children: [] },
      ],
      priorityConceptId: "variable_cost",
    });
  });
});
