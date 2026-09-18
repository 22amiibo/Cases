import type { ActivityReview } from "@/core/activity-review";
import styles from "./ActivityShell.module.css";

export function ActivityReviewSummary({ review }: { review: ActivityReview }) {
  return <div className={styles.review}>
    <div className={styles.outcome}>
      <span>{review.classification}</span>
      {review.performance && <strong>{review.performance.label}</strong>}
    </div>
    <div className={styles.coaching}>
      <section>
        <h3>What went well</h3>
        {review.strengths.length > 0 ? <ul>{review.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Your committed reasoning is recorded.</p>}
      </section>
      <section>
        <h3>What to improve</h3>
        {review.improvements.length > 0 ? <ul>{review.improvements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Carry this approach into a different context.</p>}
      </section>
    </div>
    <p><strong>Key principle:</strong> {review.principle}</p>
    <p><strong>Recommended next action:</strong> {review.nextAction}</p>
    <details className={styles.answerReview}>
      <summary>Review answers</summary>
      <ol>{review.steps.map((step, index) => <li key={`${step.label}-${index}`}>
        <strong>{step.label}</strong>
        <span>{step.learnerAnswer}</span>
        <small>{step.assessment}</small>
        {step.assessment === "Needs another look" && step.strongAnswer && <span>Strong answer: {step.strongAnswer}</span>}
      </li>)}</ol>
    </details>
  </div>;
}
