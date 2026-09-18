import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CaseWalkthrough } from "./CaseWalkthrough";

describe("CaseWalkthrough", () => {
  it("is optional, skippable, and reopenable without case-answer content", async () => {
    const user = userEvent.setup();
    render(<CaseWalkthrough />);

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "How this case works" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Build a framework");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("$756,000");
    await user.click(screen.getByRole("button", { name: "Skip walkthrough" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "How this case works" }));
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});
