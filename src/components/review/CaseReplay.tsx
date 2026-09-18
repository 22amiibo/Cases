"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LearnerCaseReview, LearnerSessionView } from "@/core/learner-case";
import { CaseEventSchema, type CaseEvent } from "@/core/schema";
import { diagnosticDefinitions, type DiagnosticCode } from "@/core/diagnostics";
import { InvestigationGroups } from "@/components/investigation/InvestigationGroups";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { CaseAttempt } from "@/data/repository";
import type { V3Repository } from "@/data/v3-repository";
import { ScoreBreakdown } from "./ScoreBreakdown";
import styles from "./review.module.css";

type CaseReplayProps = {
  review: LearnerCaseReview;
};

function stateLabel(state: LearnerCaseReview["nodes"][number]["state"]) {
  return state.replaceAll("-", " ");
}

const responseKindLabels: Record<LearnerCaseReview["generatedResponses"][number]["kind"], string> = {
  opening: "Opening response",
  calculation: "Calculation reasoning",
  synthesis: "Synthesis",
  recommendation: "Recommendation",
};

function savedFeedbackMessage(code: string) {
  return diagnosticDefinitions[code as DiagnosticCode]?.explanation ?? "A coaching note was saved with this attempt.";
}

function replayMode(events: CaseEvent[]) {
  return events.some(
    (event) => "authoredComparisonViewed" in event && !event.authoredComparisonViewed,
  )
    ? "interview"
    : "practice";
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
        <InvestigationGroups
          items={review.nodes}
          listClassName={styles.graph}
          getItemClassName={(node) => styles[node.state]}
          renderItem={(node) => (
            <>
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
            </>
          )}
        />
      </section>

      <div className={styles.analysis}>
        <ScoreBreakdown scores={review.scores} />
        <section className={styles.feedbackCard} aria-labelledby="feedback-title">
          <span>Deterministic feedback</span>
          <h2 id="feedback-title">What to carry forward</h2>
          <ul>
            {review.feedback.map((item) => (
              <li key={item.code}>
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

      {review.exhibitInterpretations.map((interpretation) => (
        <section className={styles.frameworkReview} key={interpretation.exhibitId}>
          <span>Exhibit interpretation</span>
          <h2>{interpretation.exhibitTitle}</h2>
          <ol>
            {interpretation.responses.map((response) => (
              <li key={response.responseId}>
                <strong>Revision {response.revision}</strong>
                <p>{response.text}</p>
              </li>
            ))}
          </ol>
          <p>
            Structured insight: {interpretation.insightIds.join(", ").replaceAll("-", " ")}
          </p>
        </section>
      ))}

      {review.hypotheses.length > 0 && (
        <section className={styles.frameworkReview} aria-labelledby="hypothesis-review-title">
          <span>Hypothesis history</span>
          <h2 id="hypothesis-review-title">Evidence-linked updates</h2>
          <ol>
            {review.hypotheses.map((hypothesis, index) => (
              <li key={`${hypothesis.type}-${index}`}>
                <strong>{hypothesis.status} · {hypothesis.hypothesisId ?? "no current hypothesis"}</strong>
                <p>{hypothesis.rationale}</p>
                {hypothesis.evidenceIds.length > 0 && (
                  <small>Evidence: {hypothesis.evidenceIds.join(", ").replaceAll("-", " ")}</small>
                )}
                {hypothesis.revisionOfResponseId && (
                  <small>Updates response {hypothesis.revisionOfResponseId}</small>
                )}
                <ul>
                  {hypothesis.diagnostics.map((diagnostic) => (
                    <li key={`${diagnostic.source}-${diagnostic.code}`}>
                      {diagnosticDefinitions[diagnostic.code].explanation}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      {review.generatedResponses.map((step, index) => (
        <section className={styles.frameworkReview} key={`${step.kind}-${step.label}-${index}`}>
          <span>{responseKindLabels[step.kind]}</span>
          <h2>{step.label}</h2>
          <ol>
            {step.responses.map((response) => (
              <li key={response.responseId}>
                <strong>Revision {response.revision}</strong>
                <p>{response.text}</p>
              </li>
            ))}
          </ol>
          {step.details.map((detail) => <p key={detail}>{detail.replaceAll("-", " ")}</p>)}
          <ul>
            {step.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.responseId}-${index}`}>
                {diagnosticDefinitions[diagnostic.code].explanation}
              </li>
            ))}
          </ul>
        </section>
      ))}
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

export function ReviewSession({
  caseId,
  attemptId,
}: {
  caseId: string;
  attemptId?: string;
}) {
  const [review, setReview] = useState<LearnerCaseReview | null>(null);
  const [historicalAttempt, setHistoricalAttempt] = useState<CaseAttempt | null>(null);
  const [status, setStatus] = useState<
    "loading" | "missing" | "unavailable" | "error"
  >("loading");

  useEffect(() => {
    let active = true;

    async function loadReview() {
      await Promise.resolve();
      try {
        let events: CaseEvent[];
        let contentVersion: number;
        if (attemptId) {
          const { repository, userId } = await getBrowserPracticeSession();
          const attempt = await repository.getCaseAttempt(userId, attemptId) ?? await (
            repository as typeof repository & V3Repository
          ).listCourseEvidence(userId).then(({ caseAttempts }) => {
            const v3 = caseAttempts.find((candidate) => candidate.attemptId === attemptId);
            return v3 && {
              ...v3,
              learningEvidence: null,
              caseMode: undefined,
            } as unknown as CaseAttempt;
          });
          if (!attempt || attempt.caseId !== caseId) {
            if (active) setStatus("missing");
            return;
          }
          if (!active) return;
          setHistoricalAttempt(attempt);
          events = attempt.events;
          contentVersion = attempt.contentVersion ?? 1;
        } else {
          const stored = window.sessionStorage.getItem(
            `casework:guest-session:${caseId}`,
          );
          if (!stored) {
            if (active) setStatus("missing");
            return;
          }
          const parsed = JSON.parse(stored) as {
            events?: unknown[];
            contentVersion?: unknown;
          };
          if (!Array.isArray(parsed.events)) {
            if (active) setStatus("missing");
            return;
          }
          events = parsed.events.flatMap((event) => {
            const result = CaseEventSchema.safeParse(event);
            return result.success ? [result.data] : [];
          });
          contentVersion = Number.isInteger(parsed.contentVersion)
            ? (parsed.contentVersion as number)
            : 1;
        }
        const response = await fetch(`/api/cases/${caseId}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events,
            contentVersion,
            mode: replayMode(events),
          }),
        });
        if (attemptId && response.status === 404) {
          if (active) setStatus("unavailable");
          return;
        }
        if (!response.ok) throw new Error("Unable to load review");
        const view = await response.json() as LearnerSessionView;
        if (!view.review) {
          if (active) setStatus("missing");
          return;
        }
        if (active) setReview(view.review);
      } catch {
        if (active) setStatus(attemptId ? "error" : "missing");
      }
    }

    void loadReview();
    return () => {
      active = false;
    };
  }, [attemptId, caseId]);

  if (review) return <CaseReplay review={review} />;

  if (status === "unavailable" && historicalAttempt) {
    return (
      <section className={styles.emptyState} aria-live="polite">
        <h2>Historical replay unavailable</h2>
        <p>
          This attempt remains in your history, but its exact case definition
          is unavailable. Casework did not substitute current content.
        </p>
        <p>Content version {historicalAttempt.contentVersion ?? 1}</p>
        <p>
          Completed {new Date(historicalAttempt.completedAt).toLocaleDateString(
            "en-US",
            { dateStyle: "long", timeZone: "UTC" },
          )}
        </p>
        {historicalAttempt.feedbackCodes.length > 0 && (
          <ul>{historicalAttempt.feedbackCodes.map((code, index) => (
            <li key={`${code}-${index}`}>{savedFeedbackMessage(code)}</li>
          ))}</ul>
        )}
        <Link href="/progress">Return to progress</Link>
      </section>
    );
  }

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
          ? "We could not load this saved case attempt."
          : "Finish a structured recommendation before opening the replay."}
      </p>
      {status !== "loading" && (
        <Link href={`/cases/${caseId}`}>Return to case</Link>
      )}
    </section>
  );
}
