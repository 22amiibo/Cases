import type { ExhibitDefinition } from "@/core/schema";
import { ChartExhibit } from "./ChartExhibit";
import { TableExhibit } from "./TableExhibit";
import styles from "./exhibits.module.css";

export function ExhibitRenderer({
  definition,
  revealed,
}: {
  definition: ExhibitDefinition;
  revealed: boolean;
}) {
  if (!revealed) return null;

  return (
    <section className={styles.exhibit} aria-labelledby={`${definition.id}-title`}>
      <header>
        <span>Exhibit · {definition.unit}</span>
        <h2 id={`${definition.id}-title`}>{definition.title}</h2>
      </header>
      {definition.type === "table" ? (
        <TableExhibit definition={definition} />
      ) : (
        <ChartExhibit definition={definition} />
      )}
    </section>
  );
}
