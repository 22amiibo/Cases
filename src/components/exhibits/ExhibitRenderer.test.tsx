import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExhibitDefinitionSchema } from "@/core/schema";
import { ExhibitRenderer } from "./ExhibitRenderer";

const table = ExhibitDefinitionSchema.parse({
  id: "cost-table",
  title: "Cost by category",
  type: "table",
  unit: "$m",
  sourceFactIds: ["cost-fact"],
  columns: ["Category", "Current"],
  rows: [["Labor", 24.3]],
  insights: [{ id: "labor-high", label: "Labor is high.", strength: 1 }],
});

const chart = ExhibitDefinitionSchema.parse({
  id: "trend-chart",
  title: "Member trend",
  type: "line",
  unit: "000s",
  sourceFactIds: ["member-fact"],
  categories: ["Q1", "Q2"],
  series: [{ name: "Members", data: [42, 47] }],
  insights: [{ id: "growth", label: "Members grew.", strength: 1 }],
});

describe("ExhibitRenderer", () => {
  it("renders authored table cells and unit", () => {
    render(<ExhibitRenderer definition={table} revealed />);

    expect(screen.getByRole("table", { name: "Cost by category ($m)" })).toBeVisible();
    expect(screen.getByText("Labor")).toBeVisible();
    expect(screen.getByText("24.3")).toBeVisible();
  });

  it("binds chart categories and values to an accessible alternative", () => {
    render(<ExhibitRenderer definition={chart} revealed />);

    expect(screen.getByRole("img", { name: "Member trend chart in 000s" })).toBeVisible();
    expect(screen.getByRole("table", { name: "Member trend data (000s)" })).toHaveTextContent(
      "Q1",
    );
    expect(screen.getByRole("table", { name: "Member trend data (000s)" })).toHaveTextContent(
      "47",
    );
  });

  it("does not render an unrevealed exhibit", () => {
    const { container } = render(<ExhibitRenderer definition={table} revealed={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
