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
        <span>Version-safe practice history</span>
      </header>

      <section className={styles.intro}>
        <p>V2 progress</p>
        <h1>Your learning evidence</h1>
        {progress.status === "loading" ? (
          <span role="status">Loading your practice history…</span>
        ) : progress.status === "error" ? (
          <span role="alert">
            Your practice history could not be loaded.{" "}
            <button type="button" onClick={progress.retry}>Try again</button>
          </span>
        ) : (
          <span>
            {dashboard.v2.sessionsCompleted} V2 sessions ·{" "}
            {dashboard.legacy.sessionsCompleted} Legacy V1 sessions
          </span>
        )}
      </section>

      {progress.status === "ready" && (
        <>
          <section className={styles.sectionIntro}>
            <div>
              <p>Current learning cycle</p>
              <h2>V2 diagnostic evidence</h2>
            </div>
            <p>
              Status reflects committed, reviewed, revised, and transferred
              evidence. Self-assessments are labeled and kept separate from
              system checks.
            </p>
          </section>

          <section className={styles.skills} aria-label="V2 skill progress">
            {dashboard.v2.skills.map((skill) => (
              <article className={styles.skill} key={skill.skillId}>
                <div className={styles.skillHeading}>
                  <div>
                    <p>{skill.attemptsCompleted} V2 attempts</p>
                    <h2>{skill.label}</h2>
                  </div>
                  <strong>{skill.status}</strong>
                </div>
                <div className={styles.detail}>
                  <div>
                    <h3>Evidence states</h3>
                    <ul>
                      <li>Committed: {skill.evidence.committed}</li>
                      <li>Reviewed: {skill.evidence.reviewed}</li>
                      <li>Revised: {skill.evidence.revised}</li>
                      <li>Transferred: {skill.evidence.transferred}</li>
                    </ul>
                  </div>
                  <div>
                    <h3>Diagnostic evidence</h3>
                    {skill.diagnostics.length > 0 ? (
                      <ul>
                        {skill.diagnostics.slice(0, 3).map(({ diagnostic, count }) => (
                          <li key={`${diagnostic.source}:${diagnostic.code}`}>
                            <span className={styles.source}>
                              {diagnostic.source === "self_assessment"
                                ? "Self-assessed"
                                : "System check"}
                            </span>{" "}
                            {readableFeedback(diagnostic.code)} · {count}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Complete a V2 review to see patterns.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.recommendation}>
            <p>Next V2 practice</p>
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

          <section className={styles.legacy} aria-labelledby="legacy-heading">
            <div className={styles.sectionIntro}>
              <div>
                <p>Preserved history</p>
                <h2 id="legacy-heading">Legacy V1</h2>
              </div>
              <p>
                These numeric results remain available for reference. They do
                not affect V2 status, diagnostics, or recommendations.
              </p>
            </div>
            <div className={styles.legacyGrid}>
              {dashboard.legacy.skills.map((skill) => (
                <article key={skill.skillId}>
                  <p>{skill.attemptsCompleted} attempts</p>
                  <h3>{skill.label}</h3>
                  <strong>{skill.readiness}</strong>
                  <span>
                    {skill.score === null ? "No legacy score" : `Legacy score ${skill.score}`}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
