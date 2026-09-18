import Link from "next/link";
import { activeActivityDefinitions } from "@/content/activities";
import { SKILL_LAB_LABELS } from "@/core/v3-taxonomy";
import styles from "./practice.module.css";

const descriptions = {
  clarifying: "Choose questions that change the structure or first test.",
  exhibit: "Move from observation to implication and action.",
  brainstorming: "Build broad, distinct ideas and prioritize the strongest lead.",
  hypothesis: "Update a testable claim as new evidence arrives.",
} as const;

export default function PracticePage() {
  const labs = [...new Set(activeActivityDefinitions.map(({ labId }) => labId))].map((labId) => ({
    labId,
    count: activeActivityDefinitions.filter((activity) => activity.labId === labId).length,
  }));
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.wordmark}>Casework</Link>
      <span>Four V3 flagship labs</span>
    </header>
    <section className={styles.intro}>
      <p>Focused practice</p>
      <h1>Practice one thinking move.</h1>
      <span>Commit a decision, review specific feedback, and retry while the context is fresh.</span>
    </section>
    <section className={styles.grid} aria-label="Skill Labs">
      {labs.map(({ labId, count }) => <article className={styles.card} key={labId}>
        <span>{count} exercises</span>
        <h2>{SKILL_LAB_LABELS[labId]}</h2>
        <p>{descriptions[labId as keyof typeof descriptions]}</p>
        <Link href={`/practice/${labId}`}>Open {SKILL_LAB_LABELS[labId]} lab</Link>
      </article>)}
    </section>
    <section className={styles.legacy}>
      <p>Previous practice library</p>
      <h2>Legacy V1/V2 drills remain available.</h2>
      <Link href="/drills">Open Legacy V1/V2 drills</Link>
    </section>
  </main>;
}
