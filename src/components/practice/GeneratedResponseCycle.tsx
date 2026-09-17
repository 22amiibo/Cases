"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyLearningCycleAction,
  createLearningCycleState,
  restoreLearningCycleState,
  serializeLearningCycleState,
  type LearnerLearningCyclePrompt,
  type LearningCycleReveal,
  type LearningCycleState,
} from "@/core/learning-cycle";
import type { CommittedResponse } from "@/core/schema";
import styles from "./GeneratedResponseCycle.module.css";

type GeneratedResponseCycleProps = {
  prompt: LearnerLearningCyclePrompt;
  onCommit: (response: CommittedResponse) => Promise<LearningCycleReveal>;
  createResponseId?: () => string;
  now?: () => number;
  storageKey?: string;
  onComplete?: (state: LearningCycleState) => void;
};

function defaultResponseId() {
  return crypto.randomUUID();
}

function diagnosticLabel(code: string) {
  return code.replaceAll("_", " ");
}

export function GeneratedResponseCycle({
  prompt,
  onCommit,
  createResponseId = defaultResponseId,
  now = Date.now,
  storageKey,
  onComplete,
}: GeneratedResponseCycleProps) {
  const [state, setState] = useState<LearningCycleState>(() => {
    const restored =
      storageKey && typeof window !== "undefined"
        ? restoreLearningCycleState(
            window.sessionStorage.getItem(storageKey),
            prompt.interactionId,
          )
        : null;
    return restored ?? createLearningCycleState(prompt.interactionId);
  });
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [commitStatus, setCommitStatus] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const phaseHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (storageKey) {
      window.sessionStorage.setItem(storageKey, serializeLearningCycleState(state));
    }
  }, [state, storageKey]);

  useEffect(() => {
    if (state.phase !== "drafting") phaseHeading.current?.focus();
  }, [state.phase]);

  async function commitResponse() {
    const text = draft.trim();
    if (!text || commitStatus === "saving") return;
    const previous = state.responses.at(-1);
    const response: CommittedResponse = {
      responseId: createResponseId(),
      interactionId: prompt.interactionId,
      revision: state.responses.length + 1,
      revisionOf: previous?.responseId ?? null,
      responseKind: prompt.responseKind,
      text,
      committedAtMs: now(),
    };
    setCommitStatus("saving");
    try {
      const reveal = await onCommit(response);
      setState((current) =>
        applyLearningCycleAction(current, {
          type: "response_committed",
          response,
          reveal,
        }),
      );
      setDraft("");
      setChecks({});
      setCommitStatus("idle");
    } catch {
      setCommitStatus("error");
    }
  }

  function transition(
    action: Parameters<typeof applyLearningCycleAction>[1],
  ) {
    setState((current) => applyLearningCycleAction(current, action));
  }

  if (state.phase === "skipped") {
    return (
      <section className={styles.card} aria-live="polite">
        <h2 ref={phaseHeading} tabIndex={-1}>Practice skipped</h2>
        <p>No authored answer was revealed or recorded.</p>
      </section>
    );
  }

  if (state.phase === "complete") {
    return (
      <section className={styles.card} aria-live="polite">
        <h2 ref={phaseHeading} tabIndex={-1}>Practice complete</h2>
        <p>You committed {state.responses.length} response revision{state.responses.length === 1 ? "" : "s"}.</p>
      </section>
    );
  }

  const latestResponse = state.responses.at(-1);

  return (
    <section className={styles.card} aria-labelledby="generated-cycle-title">
      {(state.phase === "drafting" || state.phase === "revising") && (
        <>
          <span className={styles.eyebrow}>
            {prompt.scaffoldingLevel} practice
          </span>
          <h2
            id="generated-cycle-title"
            ref={phaseHeading}
            tabIndex={state.phase === "revising" ? -1 : undefined}
          >
            {state.phase === "revising" ? "Try a revised response" : "Generate first"}
          </h2>
          <p>{prompt.prompt}</p>
          {prompt.guidance.length > 0 && (
            <ul className={styles.guidance}>
              {prompt.guidance.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          <label className={styles.field}>
            {state.phase === "revising" ? "Your revised response" : "Your response"}
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={10_000}
              rows={7}
            />
          </label>
          {commitStatus === "error" && (
            <p role="alert">Your response was not committed. Try again.</p>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => void commitResponse()}
              disabled={!draft.trim() || commitStatus === "saving"}
            >
              {commitStatus === "saving"
                ? "Committing response"
                : state.phase === "revising"
                  ? "Commit revision"
                  : "Commit response"}
            </button>
            {state.phase === "drafting" && (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => transition({ type: "cycle_skipped" })}
              >
                Skip this practice
              </button>
            )}
          </div>
        </>
      )}

      {state.phase === "self_check" && state.reveal && latestResponse && (
        <>
          <span className={styles.eyebrow}>
            Revision {latestResponse.revision} of {state.responses.length}
          </span>
          <h2 id="generated-cycle-title" ref={phaseHeading} tabIndex={-1}>
            Check your response
          </h2>
          <blockquote>{latestResponse.text}</blockquote>
          <fieldset className={styles.checklist}>
            <legend>Which criteria does your response meet?</legend>
            {state.reveal.criteria.map((criterion) => (
              <label key={criterion.id}>
                <input
                  type="checkbox"
                  checked={checks[criterion.id] ?? false}
                  onChange={(event) =>
                    setChecks((current) => ({
                      ...current,
                      [criterion.id]: event.target.checked,
                    }))
                  }
                />
                {criterion.label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={() =>
              transition({
                type: "self_check_submitted",
                outcomes: state.reveal?.criteria.map((criterion) => ({
                  criterionId: criterion.id,
                  met: checks[criterion.id] ?? false,
                })) ?? [],
              })
            }
          >
            Save self-check
          </button>
        </>
      )}

      {state.phase === "comparison_ready" && (
        <>
          <span className={styles.eyebrow}>Self-check saved</span>
          <h2 id="generated-cycle-title" ref={phaseHeading} tabIndex={-1}>
            Compare your reasoning
          </h2>
          <p>Your own assessment is recorded. You can now reveal one authored example.</p>
          <button
            type="button"
            onClick={() => transition({ type: "comparison_viewed" })}
          >
            View comparison
          </button>
        </>
      )}

      {state.phase === "comparison" && state.reveal && latestResponse && (
        <>
          <span className={styles.eyebrow}>Authored comparison</span>
          <h2 id="generated-cycle-title" ref={phaseHeading} tabIndex={-1}>
            {state.reveal.comparison.title}
          </h2>
          <p className={styles.comparison}>{state.reveal.comparison.text}</p>
          <div className={styles.diagnostics}>
            <h3>Your self-assessment signals</h3>
            <ul>
              {state.diagnostics
                .filter(({ responseId }) => responseId === latestResponse.responseId)
                .map((diagnostic) => (
                  <li key={`${diagnostic.responseId}-${diagnostic.code}`}>
                    <strong>{diagnosticLabel(diagnostic.code)}</strong>
                    <span>{diagnostic.severity} · self-assessed</span>
                  </li>
                ))}
            </ul>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => transition({ type: "retry_started" })}
            >
              Try another response
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                const completed = applyLearningCycleAction(state, {
                  type: "cycle_completed",
                });
                if (storageKey) {
                  window.sessionStorage.setItem(
                    storageKey,
                    serializeLearningCycleState(completed),
                  );
                }
                setState(completed);
                onComplete?.(completed);
              }}
            >
              Finish practice
            </button>
          </div>
        </>
      )}
    </section>
  );
}
