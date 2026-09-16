"use client";

import { useState } from "react";
import type { RevealedFact } from "@/core/case-engine";
import type {
  LearnerRecommendation,
  RecommendationSubmission,
} from "@/core/learner-case";
import styles from "./RecommendationBuilder.module.css";

type RecommendationBuilderProps = {
  recommendation: LearnerRecommendation;
  facts: RevealedFact[];
  onSubmit: (submission: RecommendationSubmission) => void | Promise<void>;
};

export function RecommendationBuilder({
  recommendation,
  facts,
  onSubmit,
}: RecommendationBuilderProps) {
  const [submission, setSubmission] = useState<RecommendationSubmission>({
    decisionId: "",
    evidenceIds: [],
    riskId: "",
    nextStepId: "",
  });
  const ready =
    Boolean(submission.decisionId) &&
    submission.evidenceIds.length > 0 &&
    Boolean(submission.riskId) &&
    Boolean(submission.nextStepId);

  function toggleEvidence(factId: string) {
    setSubmission((current) => ({
      ...current,
      evidenceIds: current.evidenceIds.includes(factId)
        ? current.evidenceIds.filter((id) => id !== factId)
        : current.evidenceIds.length < 3
          ? [...current.evidenceIds, factId]
          : current.evidenceIds,
    }));
  }

  return (
    <section className={styles.builder} aria-labelledby="recommendation-title">
      <span>Recommend</span>
      <h2 id="recommendation-title">Make your recommendation</h2>
      <p>Commit to a decision and make the evidence, risk, and first step explicit.</p>

      <label className={styles.selectLabel}>
        Recommendation
        <select
          value={submission.decisionId}
          onChange={(event) =>
            setSubmission((current) => ({
              ...current,
              decisionId: event.target.value,
            }))
          }
        >
          <option value="">Choose a decision</option>
          {recommendation.decisions.map((decision) => (
            <option value={decision.id} key={decision.id}>
              {decision.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className={styles.evidence}>
        <legend>Discovered evidence (choose 1–3)</legend>
        {facts.map((fact) => (
          <label key={fact.id}>
            <input
              type="checkbox"
              checked={submission.evidenceIds.includes(fact.id)}
              onChange={() => toggleEvidence(fact.id)}
            />
            <span>{fact.text}</span>
          </label>
        ))}
      </fieldset>

      <label className={styles.selectLabel}>
        Risk to manage
        <select
          value={submission.riskId}
          onChange={(event) =>
            setSubmission((current) => ({ ...current, riskId: event.target.value }))
          }
        >
          <option value="">Choose a risk</option>
          {recommendation.risks.map((risk) => (
            <option value={risk.id} key={risk.id}>
              {risk.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.selectLabel}>
        First next step
        <select
          value={submission.nextStepId}
          onChange={(event) =>
            setSubmission((current) => ({
              ...current,
              nextStepId: event.target.value,
            }))
          }
        >
          <option value="">Choose a next step</option>
          {recommendation.nextSteps.map((nextStep) => (
            <option value={nextStep.id} key={nextStep.id}>
              {nextStep.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" disabled={!ready} onClick={() => void onSubmit(submission)}>
        Submit recommendation
      </button>
    </section>
  );
}
