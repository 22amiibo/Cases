import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Scratchpad } from "./Scratchpad";

describe("Scratchpad", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("continues bullets and supports Tab and Shift+Tab indentation", async () => {
    const user = userEvent.setup();
    render(<Scratchpad storageKey="scratch-test" />);
    const notes = screen.getByRole("textbox", { name: "Scratchpad" });

    await user.type(notes, "- Revenue{Enter}Cost");
    expect(notes).toHaveValue("- Revenue\n- Cost");
    await user.keyboard("{Tab}");
    expect(notes).toHaveValue("- Revenue\n  - Cost");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(notes).toHaveValue("- Revenue\n- Cost");
  });
});
