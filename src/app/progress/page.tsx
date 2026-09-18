"use client";

import Link from "next/link";
import {
  buildProgressDashboard,
  buildRecommendedSession,
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
                      <li>Reduced scaffolding: {skill.evidence.reducedScaffolding}</li>
                    </ul>
                  </div>
                  <div>
                    <h3>Diagnostic evidence</h3>
                    {skill.diagnostics.length > 0 ? (
                      <ul>
                        {skill.diagnostics.slice(0, 3).map((diagnostic) => (
                          <li key={`${diagnostic.source}:${diagnostic.code}`}>
                            <span className={styles.source}>
                              {diagnostic.source === "self_assessment"
                                ? "Self-assessed"
                                : "System check"}
                            </span>{" "}
                            {readableFeedback(diagnostic.code)} · {diagnostic.count}
                            {" · latest "}{diagnostic.lastSeenAt.slice(0, 10)}
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

          <section className={styles.hypothesis} aria-labelledby="hypothesis-progress-heading">
            <div>
              <p>Case reasoning</p>
              <h2 id="hypothesis-progress-heading">Hypothesis updates</h2>
              <span>
                {dashboard.v2.hypothesis.casesReviewed} V2 case review
                {dashboard.v2.hypothesis.casesReviewed === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <h3>Diagnostic evidence</h3>
              {dashboard.v2.hypothesis.diagnostics.length > 0 ? (
                <ul>
                  {dashboard.v2.hypothesis.diagnostics.map((diagnostic) => (
                    <li key={`${diagnostic.source}:${diagnostic.code}`}>
                      <span className={styles.source}>
                        {diagnostic.source === "self_assessment"
                          ? "Self-assessed"
                          : "System check"}
                      </span>{" "}
                      {readableFeedback(diagnostic.code)} · {diagnostic.count}
                      {" · latest "}{diagnostic.lastSeenAt.slice(0, 10)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Complete a V2 case update to see hypothesis patterns.</p>
              )}
              <small>
                This reflects how you updated your thinking; it is not graded
                as a separate score.
              </small>
            </div>
          </section>

          <section className={styles.recommendation}>
            <p>Next V2 practice</p>
            <h2>Recommended next: {recommendation.title}</h2>
            <span>{recommendation.explanation}</span>
            {recommendation.diagnosis && (
              <span className={styles.recommendationSource}>
                {recommendation.diagnosis.source === "self_assessment"
                  ? "Self-assessed pattern"
                  : "Objective system finding"}
              </span>
            )}
            <div>
              <Link href={recommendation.practice.href}>
                Practice {recommendation.practice.label} · V{recommendation.practice.contentVersion} →
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
