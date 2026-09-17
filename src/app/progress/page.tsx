"use client";

import Link from "next/link";
import {
  buildProgressDashboard,
  buildRecommendedSession,
  SKILL_LABELS,
} from "@/core/progress-dashboard";
import { usePracticeProgress } from "@/components/progress/usePracticeProgress";
import styles from "./progress.module.css";

function readableFeedback(code: string) {
  return code.replaceAll("_", " ");
}

export default function ProgressPage() {
  const progress = usePracticeProgress();
  const dashboard = buildProgressDashboard(progress.history);
  const recommendation = buildRecommendedSession(progress.history);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>Casework</Link>
        <span>Practice history · last 10 attempts</span>
      </header>

      <section className={styles.intro}>
        <p>Progress dashboard</p>
        <h1>Your practice progress</h1>
        {progress.status === "loading" ? (
          <span role="status">Loading your practice history…</span>
        ) : progress.status === "error" ? (
          <span role="alert">
            Your practice history could not be loaded.{" "}
            <button type="button" onClick={progress.retry}>Try again</button>
          </span>
        ) : (
          <span>{dashboard.sessionsCompleted} sessions completed</span>
        )}
      </section>

      {progress.status === "ready" && (
        <>
          <section className={styles.skills} aria-label="Skill progress">
            {dashboard.skills.map((skill) => (
              <article className={styles.skill} key={skill.skillId}>
                <div className={styles.skillHeading}>
                  <div>
                    <p>{skill.attemptsCompleted} attempts</p>
                    <h2>{skill.label}</h2>
                  </div>
                  <strong>{skill.readiness}</strong>
                </div>
                <div className={styles.detail}>
                  <div>
                    <h3>Last-10 trend</h3>
                    <p>
                      {skill.trend.length > 0
                        ? skill.trend.join(" → ")
                        : "No attempts yet"}
                    </p>
                  </div>
                  <div>
                    <h3>Common feedback</h3>
                    {skill.commonFeedbackCodes.length > 0 ? (
                      <ul>
                        {skill.commonFeedbackCodes.map((code) => (
                          <li key={code}>
                            <code>{code}</code>
                            <span> — {readableFeedback(code)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Complete a session to see patterns.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.recommendation}>
            <p>Next practice</p>
            <h2>Recommended next: {recommendation.title}</h2>
            <div>
              <Link href={recommendation.drillHref}>
                Practice {SKILL_LABELS[recommendation.skillId]} →
              </Link>
              <Link href={recommendation.caseHref}>
                Practice {recommendation.caseTitle} →
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
