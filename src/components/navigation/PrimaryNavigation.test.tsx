import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrimaryNavigation } from "./PrimaryNavigation";

let pathname = "/learn/courses/profitability-v3";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("PrimaryNavigation", () => {
  beforeEach(() => {
    pathname = "/learn/courses/profitability-v3";
  });

  it("exposes the four exact primary destinations and marks the current section", () => {
    render(<PrimaryNavigation />);

    const navigation = screen.getByRole("navigation", { name: "Primary" });
    const links = Array.from(navigation.querySelectorAll("a"));
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Learn", "/learn"],
      ["Practice", "/practice"],
      ["Cases", "/cases"],
      ["Progress", "/progress"],
    ]);
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark a section current on legacy drill routes", () => {
    pathname = "/drills/quantitative";
    render(<PrimaryNavigation />);

    expect(screen.queryByRole("link", { current: "page" })).toBeNull();
  });
});
