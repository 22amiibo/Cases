"use client";

import Link from "next/link";
import { buildRecommendedSession } from "@/core/progress-dashboard";
import { usePracticeProgress } from "./usePracticeProgress";
import styles from "./HomeRecommendation.module.css";

export function HomeRecommendation() {
  const progress = usePracticeProgress();
  if (progress.status === "loading") return null;

  if (progress.status === "error") {
    return (
      <section className={styles.recommendation} aria-label="Recommended practice">
        <p>Your next useful rep</p>
        <h2>Recommendation unavailable</h2>
        <span>Your progress could not be loaded.</span>
        <div className={styles.actions}>
          <button type="button" onClick={progress.retry}>Try again</button>
        </div>
      </section>
    );
  }

  const recommendation = buildRecommendedSession(progress.history);

  return (
    <section className={styles.recommendation} aria-label="Recommended practice">
      <p>Your next useful rep</p>
      <h2>Recommended next: {recommendation.title}</h2>
      <span>{recommendation.explanation}</span>
      {recommendation.diagnosis && (
        <span>
          {recommendation.diagnosis.source === "self_assessment"
            ? "Your reflection"
            : "Coach feedback"}
        </span>
      )}
      <div className={styles.actions}>
        <Link href={recommendation.practice.href}>
          Practice {recommendation.practice.label} →
        </Link>
      </div>
    </section>
  );
}
