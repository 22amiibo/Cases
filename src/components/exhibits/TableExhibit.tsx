import type { LearnerExhibitDefinition } from "@/core/learner-case";
import styles from "./exhibits.module.css";

export function TableExhibit({
  definition,
}: {
  definition: LearnerExhibitDefinition;
}) {
  return (
    <table
      className={styles.table}
      aria-label={`${definition.title} (${definition.unit})`}
    >
      <caption>
        {definition.title} · {definition.unit}
      </caption>
      <thead>
        <tr>
          {definition.columns.map((column) => (
            <th scope="col" key={column}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {definition.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th scope="row" key={cellIndex}>
                  {cell}
                </th>
              ) : (
                <td key={cellIndex}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
