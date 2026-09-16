import { ExhibitRenderer } from "@/components/exhibits/ExhibitRenderer";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import type { RevealedFact } from "@/core/case-engine";
import styles from "./EvidencePanel.module.css";

type EvidencePanelProps = {
  facts: RevealedFact[];
  exhibits: LearnerExhibitDefinition[];
};

export function EvidencePanel({
  facts,
  exhibits,
}: EvidencePanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="evidence-title">
      <div className={styles.heading}>
        <span>Evidence desk</span>
        <h2 id="evidence-title">What you know now</h2>
      </div>

      {facts.length === 0 ? (
        <p className={styles.empty}>
          Select a structured investigation to reveal authored evidence.
        </p>
      ) : (
        <ul className={styles.facts}>
          {facts.map((fact) => (
            <li key={fact.id}>{fact.text}</li>
          ))}
        </ul>
      )}

      <div className={styles.exhibits}>
        {exhibits.map((exhibit) => (
          <ExhibitRenderer
            definition={exhibit}
            key={exhibit.id}
            revealed
          />
        ))}
      </div>
    </section>
  );
}
