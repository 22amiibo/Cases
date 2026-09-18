import Link from "next/link";
import { caseDefinitions } from "@/content/cases";
import styles from "./page.module.css";

export default function CasesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">Casework</Link>
        <span>Full cases · deliberate practice</span>
      </header>

      <section className={styles.intro}>
        <p>Full-case practice</p>
        <h1>Work the problem, one decision at a time.</h1>
        <span>
          Build your structure, choose the next useful question, and make a
          recommendation from the evidence you uncover.
        </span>
      </section>

      <section className={styles.list} aria-label="Available cases">
        {caseDefinitions.map((caseDefinition) => (
          <article className={styles.caseCard} key={caseDefinition.id}>
            <div>
              <span>
                {caseDefinition.category} · {caseDefinition.opening?.responseCycle.scaffoldingLevel === "interview"
                  ? "lower-scaffolding transfer"
                  : caseDefinition.difficulty}
              </span>
              <h2>{caseDefinition.title}</h2>
              <p>{caseDefinition.objective}</p>
            </div>
            <Link href={`/cases/${caseDefinition.id}`}>
              Start {caseDefinition.title}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
