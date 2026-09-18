import type { QuantitativeFeedback } from "@/core/quantitative-feedback";
import styles from "./QuantitativeFeedbackPanel.module.css";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

export function QuantitativeFeedbackPanel({ feedback }: { feedback: QuantitativeFeedback }) {
  if (feedback.answerCorrect && feedback.unitCorrect) {
    return (
      <div className={styles.correct} role="status">
        <strong>Correct</strong>
        <span>{formatNumber(feedback.submittedAnswer)} {feedback.submittedUnit}</span>
      </div>
    );
  }

  return (
    <section className={styles.correction} aria-live="polite">
      <p>Review your calculation</p>
      <h3>Your answer: {formatNumber(feedback.submittedAnswer)} {feedback.submittedUnit}</h3>
      <dl>
        <div>
          <dt>Numeric answer</dt>
          <dd>{feedback.answerCorrect ? "Correct" : "Needs correction"}</dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>{feedback.unitCorrect ? "Correct" : "Needs correction"}</dd>
        </div>
      </dl>
      <p className={styles.answer}>
        Correct answer: <strong>{formatNumber(feedback.correctAnswer)} {feedback.correctUnit}</strong>
      </p>
      <div className={styles.reasoning}>
        <strong>Why</strong>
        <p>{feedback.explanation}</p>
      </div>
    </section>
  );
}
