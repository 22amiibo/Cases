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
      {activeActivityDefinitions.map((activity, index) => <article className={styles.card} key={activity.id}>
        <span>0{index + 1} · {activity.estimatedMinutes} min</span>
        <h2>{SKILL_LAB_LABELS[activity.labId]}</h2>
        <p>{descriptions[activity.labId as keyof typeof descriptions]}</p>
        <Link href={`/practice/${activity.labId}`}>Open {SKILL_LAB_LABELS[activity.labId]} lab</Link>
      </article>)}
    </section>
    <section className={styles.legacy}>
      <p>Previous practice library</p>
      <h2>Legacy V1/V2 drills remain available.</h2>
      <Link href="/drills">Open Legacy V1/V2 drills</Link>
    </section>
  </main>;
}
