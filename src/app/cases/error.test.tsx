import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CasesError from "./error";

describe("case content error screen", () => {
  it("explains invalid case content and offers a retry", async () => {
    const reset = vi.fn();
    render(<CasesError error={new Error("Invalid case definition")} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: "Case content could not be loaded" }),
    ).toBeVisible();
    expect(
      screen.getByText(/case definition did not pass validation/i),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
