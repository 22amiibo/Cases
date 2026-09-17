"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LearnerCaseReview, LearnerSessionView } from "@/core/learner-case";
import { CaseEventSchema } from "@/core/schema";
import { ScoreBreakdown } from "./ScoreBreakdown";
import styles from "./review.module.css";

type CaseReplayProps = {
  review: LearnerCaseReview;
};

function stateLabel(state: LearnerCaseReview["nodes"][number]["state"]) {
  return state.replaceAll("-", " ");
}

export function CaseReplay({ review }: CaseReplayProps) {
  return (
    <div className={styles.reviewGrid}>
      <section className={styles.replayCard} aria-labelledby="replay-title">
        <span>Case replay</span>
        <h2 id="replay-title">Your investigation path</h2>
        <p>
          Each branch is shown from the authoritative case graph after your
          {review.events.length} recorded investigation moves were scored.
        </p>
        <ol className={styles.graph}>
          {review.nodes.map((node) => (
            <li className={styles[node.state]} key={node.id}>
              <span>{stateLabel(node.state)}</span>
              <strong>{node.label}</strong>
              {node.prerequisiteNodeIds.length > 0 && (
                <small>
                  After {node.prerequisiteNodeIds
                    .map(
                      (id) =>
                        review.nodes.find((candidate) => candidate.id === id)
                          ?.label ?? id,
                    )
                    .join(" → ")}
                </small>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.analysis}>
        <ScoreBreakdown scores={review.scores} />
        <section className={styles.feedbackCard} aria-labelledby="feedback-title">
          <span>Deterministic feedback</span>
          <h2 id="feedback-title">What to carry forward</h2>
          <ul>
            {review.feedback.map((item) => (
              <li key={item.code}>
                <code>{item.code}</code>
                <p>{item.message}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={styles.efficientPath} aria-labelledby="efficient-path-title">
        <span>Example efficient path</span>
        <h2 id="efficient-path-title">{review.efficientPath.label}</h2>
        <ol>
          {review.efficientPath.nodeIds.map((nodeId) => (
            <li key={nodeId}>
              {review.nodes.find((node) => node.id === nodeId)?.label ?? nodeId}
            </li>
          ))}
        </ol>
      </section>

      {review.framework && (
        <section className={styles.frameworkReview} aria-labelledby="framework-review-title">
          <span>Your submitted framework</span>
          <h2 id="framework-review-title">
            {review.framework.source === "v2_hierarchy"
              ? "Preserved issue tree"
              : "Legacy flat framework"}
          </h2>
          {review.framework.rationale && <p>{review.framework.rationale}</p>}
          <FrameworkTree
            branches={review.framework.branches}
            priorityConceptId={review.framework.priorityConceptId}
          />
        </section>
      )}
    </div>
  );
}

function FrameworkTree({
  branches,
  priorityConceptId,
}: {
  branches: NonNullable<LearnerCaseReview["framework"]>["branches"];
  priorityConceptId: string;
}) {
  return (
    <ol className={styles.frameworkTree}>
      {branches.map((branch) => (
        <li key={branch.conceptId}>
          <strong>
            {branch.conceptId.replaceAll("_", " ")}
            {branch.conceptId === priorityConceptId ? " · starting priority" : ""}
          </strong>
          {branch.children.length > 0 && (
            <FrameworkTree
              branches={branch.children}
              priorityConceptId={priorityConceptId}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

export function ReviewSession({ caseId }: { caseId: string }) {
  const [review, setReview] = useState<LearnerCaseReview | null>(null);
  const [status, setStatus] = useState<"loading" | "missing" | "error">("loading");

  useEffect(() => {
    let active = true;

    async function loadReview() {
      await Promise.resolve();
      try {
        const stored = window.sessionStorage.getItem(
          `casework:guest-session:${caseId}`,
        );
        if (!stored) {
          if (active) setStatus("missing");
          return;
        }
        const parsed = JSON.parse(stored) as { events?: unknown[] };
        if (!Array.isArray(parsed.events)) {
          if (active) setStatus("missing");
          return;
        }
        const events = parsed.events.flatMap((event) => {
          const result = CaseEventSchema.safeParse(event);
          return result.success ? [result.data] : [];
        });
        void fetch(`/api/cases/${caseId}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("Unable to load review");
            return response.json() as Promise<LearnerSessionView>;
          })
          .then((view) => {
            if (!view.review) {
              if (active) setStatus("missing");
              return;
            }
            if (active) setReview(view.review);
          })
          .catch(() => {
            if (active) setStatus("error");
          });
      } catch {
        if (active) setStatus("missing");
      }
    }

    void loadReview();
    return () => {
      active = false;
    };
  }, [caseId]);

  if (review) return <CaseReplay review={review} />;

  return (
    <section className={styles.emptyState} aria-live="polite">
      <h2>
        {status === "loading"
          ? "Loading your review"
          : status === "error"
            ? "Your review could not be loaded"
            : "No completed case to review"}
      </h2>
      <p>
        {status === "error"
          ? "We could not load this saved case session."
          : "Finish a structured recommendation before opening the replay."}
      </p>
      {status !== "loading" && (
        <Link href={`/cases/${caseId}`}>Return to case</Link>
      )}
    </section>
  );
}
