import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChoiceListbox } from "./ChoiceListbox";

const options = [
  { id: "dollars", label: "$" },
  { id: "percent", label: "%" },
  { id: "hours", label: "hours" },
];

describe("ChoiceListbox", () => {
  it("supports keyboard selection with combobox and listbox semantics", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChoiceListbox
        label="Unit"
        value=""
        placeholder="Choose a unit"
        options={options}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Unit" });
    await user.click(trigger);
    expect(screen.getByRole("listbox", { name: "Unit" })).toBeVisible();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("percent");
    expect(screen.queryByRole("listbox", { name: "Unit" })).toBeNull();
  });
});
