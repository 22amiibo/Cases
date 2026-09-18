import Link from "next/link";
import {
  drillBanks,
  drillSkillIds,
  type DrillSkillId,
} from "@/content/drills";
import styles from "./drills.module.css";

const skillCopy: Record<
  DrillSkillId,
  { index: string; title: string; description: string }
> = {
  structure: {
    index: "01",
    title: "Structuring",
    description: "Build distinct, decision-relevant branches from an ambiguous prompt.",
  },
  prioritization: {
    index: "02",
    title: "Prioritization",
    description: "Choose the next question with the highest information value.",
  },
  quantitative: {
    index: "03",
    title: "Quantitative reasoning",
    description: "Turn clean arithmetic into a useful business implication.",
  },
  exhibit: {
    index: "04",
    title: "Exhibit interpretation",
    description: "Move from what, to so what, to now what.",
  },
  synthesis: {
    index: "05",
    title: "Synthesis",
    description: "Select the evidence that actually changes the decision.",
  },
  clarification: {
    index: "06",
    title: "Case opening & clarification",
    description: "Frame the decision and ask a focused set of high-information questions.",
  },
};

export default function DrillsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          Casework
        </Link>
        <span>Six trainable skills · V1 library plus V2 pilot reps</span>
      </header>

      <section className={styles.intro}>
        <p>Deliberate practice library</p>
        <h1>Choose one thinking move</h1>
        <span>
          Short sessions isolate the judgment calls that full cases tend to hide.
        </span>
      </section>

      <section className={styles.grid} aria-label="Drill skills">
        {drillSkillIds.map((skillId) => {
          const skill = skillCopy[skillId];
          return (
            <Link href={`/drills/${skillId}`} className={styles.card} key={skillId}>
              <span className={styles.index}>{skill.index}</span>
              <div>
                <h2>{skill.title}</h2>
                <p>{skill.description}</p>
              </div>
              <span className={styles.count}>
                {skillId === "clarification"
                  ? "3 V2 pilot reps →"
                  : `3 V2 reps · ${drillBanks[skillId].length} legacy →`}
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
