import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PracticePage from "./page";

describe("Practice page", () => {
  it("lists four flagship labs with three exercises each and preserves legacy drills", () => {
    render(<PracticePage />);
    expect(screen.getAllByRole("link", { name: /Open .* lab/ })).toHaveLength(4);
    expect(screen.getAllByText("3 exercises")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Open Legacy V1/V2 drills" })).toHaveAttribute("href", "/drills");
  });
});
