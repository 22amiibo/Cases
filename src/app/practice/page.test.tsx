import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PracticePage from "./page";

describe("Practice page", () => {
  it("lists exactly the four active flagship labs and preserves legacy drills", () => {
    render(<PracticePage />);
    expect(screen.getAllByRole("link", { name: /Open .* lab/ })).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Open Legacy V1/V2 drills" })).toHaveAttribute("href", "/drills");
  });
});
