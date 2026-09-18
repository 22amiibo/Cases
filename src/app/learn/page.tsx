import Link from "next/link";
import { EmbeddedV2Practice } from "@/components/learn/EmbeddedV2Practice";
import { lessonDefinitions as lessons } from "@/content/lessons/index";
import styles from "./learn.module.css";

type Lesson = (typeof lessons)[number];

const sections: Array<{
  kind: Lesson["kind"];
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    kind: "skill",
    eyebrow: "Core moves",
    title: "Six moves to practice deliberately",
    description:
      "Use these short modules before a drill or whenever a full case exposes a weak spot.",
  },
  {
    kind: "pattern",
    eyebrow: "Recurring patterns",
    title: "Five patterns worth recognizing early",
    description:
      "These patterns recur across industries. Recognizing them helps you choose a sharper next question.",
  },
];

export default function LearnPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          Casework
        </Link>
        <Link href="/drills">Browse all drills →</Link>
      </header>

      <section className={styles.intro}>
        <p>Learn, then practice</p>
        <h1>Compact lessons for better case judgment</h1>
        <span>
          Eleven practical ideas, each paired with a drill. Read one, use it
          immediately, and return when you need a reset.
        </span>
      </section>

      {sections.map((section) => (
        <section className={styles.lessonSection} key={section.kind}>
          <div className={styles.sectionHeading}>
            <p>{section.eyebrow}</p>
            <div>
              <h2>{section.title}</h2>
              <span>{section.description}</span>
            </div>
          </div>

          <div className={styles.lessonGrid}>
            {lessons
              .filter((lesson) => lesson.kind === section.kind)
              .map((lesson, index) => (
                <article className={styles.lesson} key={lesson.id}>
                  <span className={styles.number}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{lesson.title}</h3>
                  <p className={styles.summary}>{lesson.summary}</p>
                  <ul>
                    {lesson.principles.map((principle) => (
                      <li key={principle}>{principle}</li>
                    ))}
                  </ul>
                  <p className={styles.example}>
                    <strong>In a case</strong>
                    {lesson.example}
                  </p>
                  {lesson.kind === "skill" && lesson.practice ? (
                    <details className={styles.embeddedPractice}>
                      <summary>Open exact V2 practice</summary>
                      <EmbeddedV2Practice {...lesson.practice} />
                      <Link className={styles.practiceLink} href={lesson.drillRoute}>
                        Open this rep full page <span aria-hidden="true">→</span>
                      </Link>
                    </details>
                  ) : (
                    <Link className={styles.practiceLink} href={lesson.drillRoute}>
                      Practice this pattern <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </article>
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}
