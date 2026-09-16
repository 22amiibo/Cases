import Link from "next/link";
import styles from "./page.module.css";

const practicePaths = [
  {
    eyebrow: "01 / Focus",
    title: "Practice a skill",
    description: "Sharpen one move at a time with short, scored drills.",
    href: "/drills",
  },
  {
    eyebrow: "02 / Integrate",
    title: "Practice a case",
    description: "Work from an ambiguous prompt to a defensible recommendation.",
    href: null,
  },
  {
    eyebrow: "03 / Improve",
    title: "View progress",
    description: "See patterns in your reasoning and choose the next useful rep.",
    href: null,
  },
] as const;

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.grain} aria-hidden="true" />
      <header className={styles.header}>
        <span className={styles.wordmark}>Casework</span>
        <span className={styles.status}>Practice studio · opening soon</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Build the judgment behind the framework.</p>
        <h1>Practice case interviews by practicing the thinking.</h1>
        <p className={styles.lede}>
          Deliberate drills, realistic cases, and feedback you can trace back to
          every decision—without AI guesswork.
        </p>
      </section>

      <section className={styles.paths} aria-label="Practice paths">
        {practicePaths.map((path) => {
          const content = (
            <>
              <span>{path.eyebrow}</span>
              <h2>{path.title}</h2>
              <p>{path.description}</p>
            </>
          );

          return path.href ? (
            <Link className={`${styles.card} ${styles.active}`} href={path.href} key={path.title}>
              {content}
            </Link>
          ) : (
            <article className={styles.card} key={path.title} data-status="coming-soon">
              {content}
            </article>
          );
        })}
      </section>
    </main>
  );
}
