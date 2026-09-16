"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExhibitDefinition } from "@/core/schema";
import styles from "./exhibits.module.css";

const colors = ["#294c3b", "#c0693f", "#78937d", "#d4a45d"];

export function ChartExhibit({ definition }: { definition: ExhibitDefinition }) {
  const data = definition.categories.map((category, categoryIndex) => {
    const row: Record<string, string | number> = { category };
    definition.series.forEach((series) => {
      row[series.name] = series.data[categoryIndex];
    });
    return row;
  });
  const isLine = definition.type === "line";

  return (
    <div className={styles.chartBlock}>
      <div
        className={styles.chart}
        role="img"
        aria-label={`${definition.title} chart in ${definition.unit}`}
      >
        {isLine ? (
          <LineChart width={640} height={320} data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9ddd6" />
            <XAxis dataKey="category" />
            <YAxis label={{ value: definition.unit, angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {definition.series.map((series, index) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={colors[index % colors.length]}
                strokeWidth={3}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart width={640} height={320} data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9ddd6" />
            <XAxis dataKey="category" />
            <YAxis label={{ value: definition.unit, angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {definition.series.map((series, index) => (
              <Bar
                key={series.name}
                dataKey={series.name}
                fill={colors[index % colors.length]}
                stackId={definition.type === "stacked_bar" ? "stack" : undefined}
              />
            ))}
          </BarChart>
        )}
      </div>

      <table
        className={styles.table}
        aria-label={`${definition.title} data (${definition.unit})`}
      >
        <caption>Text alternative · {definition.unit}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            {definition.series.map((series) => (
              <th scope="col" key={series.name}>
                {series.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.category}>
              <th scope="row">{row.category}</th>
              {definition.series.map((series) => (
                <td key={series.name}>{row[series.name]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
