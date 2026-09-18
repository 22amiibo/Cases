import Link from "next/link";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { HomeRecommendation } from "@/components/progress/HomeRecommendation";
import styles from "./page.module.css";

const practicePaths = [
  {
    title: "Learn the moves",
    description: "Read one concise lesson, then apply it in a matching drill.",
    href: "/learn",
  },
  {
    title: "Practice a skill",
    description: "Sharpen one move at a time with short, scored drills.",
    href: "/drills",
  },
  {
    title: "Practice a case",
    description: "Work from an ambiguous prompt to a defensible recommendation.",
    href: "/cases",
  },
  {
    title: "View progress",
    description: "See patterns in your reasoning and choose the next useful rep.",
    href: "/progress",
  },
] as const;

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.grain} aria-hidden="true" />
      <header className={styles.header}>
        <span className={styles.wordmark}>Casework</span>
        <span className={styles.status}>Practice studio</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Your practice desk</p>
        <h1>Choose your next useful rep.</h1>
        <p className={styles.lede}>
          Build one skill, work a complete case, or review what to practice next.
        </p>
      </section>

      <AuthPanel />

      <HomeRecommendation />

      <section className={styles.paths} aria-label="Practice paths">
        {practicePaths.map((path) => {
          const content = (
            <>
              <h2>{path.title}</h2>
              <p>{path.description}</p>
            </>
          );

          return path.href ? (
            <Link className={`${styles.card} ${styles.active}`} href={path.href} key={path.title}>
              {content}
            </Link>
          ) : null;
        })}
      </section>
    </main>
  );
}
