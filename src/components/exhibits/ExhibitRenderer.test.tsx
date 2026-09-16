import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExhibitDefinitionSchema } from "@/core/schema";
import { ExhibitRenderer } from "./ExhibitRenderer";

vi.mock("recharts", () => ({
  Bar: ({ dataKey }: { dataKey: string }) => <span data-bar-key={dataKey} />,
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown }) => (
    <div data-chart-data={JSON.stringify(data)} data-testid="bar-chart">
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  Legend: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

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

const waterfall = ExhibitDefinitionSchema.parse({
  id: "material-waterfall",
  title: "Material cost variance",
  type: "waterfall",
  unit: "$m",
  sourceFactIds: ["material-fact"],
  categories: ["Prior", "Price", "Waste", "Current"],
  series: [{ name: "Change", data: [20, 5, 2, 27] }],
  insights: [{ id: "price-largest", label: "Supplier price is the largest variance.", strength: 1 }],
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

  it("renders waterfall deltas from their cumulative totals while retaining authored values", () => {
    render(<ExhibitRenderer definition={waterfall} revealed />);

    expect(JSON.parse(screen.getByTestId("bar-chart").dataset.chartData ?? "[]")).toEqual([
      { category: "Prior", waterfallOffset: 0, waterfallTotal: 20 },
      { category: "Price", waterfallIncrease: 5, waterfallOffset: 20 },
      { category: "Waste", waterfallIncrease: 2, waterfallOffset: 25 },
      { category: "Current", waterfallOffset: 0, waterfallTotal: 27 },
    ]);
    expect(screen.getByRole("table", { name: "Material cost variance data ($m)" })).toHaveTextContent(
      "20",
    );
    expect(screen.getByRole("table", { name: "Material cost variance data ($m)" })).toHaveTextContent(
      "27",
    );
  });

  it("does not render an unrevealed exhibit", () => {
    const { container } = render(<ExhibitRenderer definition={table} revealed={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
