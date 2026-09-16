import type { LearnerScoreDimension } from "@/core/learner-case";
import styles from "./review.module.css";

export function ScoreBreakdown({ scores }: { scores: LearnerScoreDimension[] }) {
  return (
    <section className={styles.scoreCard} aria-labelledby="score-breakdown-title">
      <span>Score breakdown</span>
      <h2 id="score-breakdown-title">How the case came together</h2>
      <div className={styles.scoreList}>
        {scores.map((score) => (
          <div className={styles.scoreRow} key={score.id}>
            <div>
              <span>{score.label}</span>
              <strong>{Math.round(score.value * 100)}%</strong>
            </div>
            <div
              aria-label={`${score.label}: ${Math.round(score.value * 100)}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(score.value * 100)}
              className={styles.track}
              role="progressbar"
            >
              <span style={{ width: `${Math.round(score.value * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
