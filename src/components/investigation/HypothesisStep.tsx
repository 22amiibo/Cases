"use client";

import { useState } from "react";
import { GeneratedResponseCycle } from "@/components/practice/GeneratedResponseCycle";
import { restoreLearningCycleState, type LearningCycleReveal, type LearningCycleState } from "@/core/learning-cycle";
import type { LearnerSessionView } from "@/core/learner-case";
import type { CommittedResponse } from "@/core/schema";
import type { RevealedFact } from "@/core/case-engine";
import styles from "./HypothesisStep.module.css";

type HypothesisPractice = NonNullable<LearnerSessionView["hypothesis"]>;

function hypothesisStorageKey(caseId: string, phase: "initial" | "update") {
  return `casework:guest-session:${caseId}:hypothesis:${phase}`;
}

export function clearHypothesisPracticeStorage(
  storage: Pick<Storage, "removeItem">,
  caseId: string,
) {
  storage.removeItem(hypothesisStorageKey(caseId, "initial"));
  storage.removeItem(hypothesisStorageKey(caseId, "update"));
}

export type HypothesisCompletion = {
  phase: "initial" | "update";
  cycle: LearningCycleState;
  hypothesisId: string | null;
  status?: "retain" | "revise" | "reject";
  evidenceIds: string[];
};

export function HypothesisStep({
  caseId,
  practice,
  facts,
  onCommit,
  onComplete,
}: {
  caseId: string;
  practice: HypothesisPractice;
  facts: RevealedFact[];
  onCommit: (phase: "initial" | "update", response: CommittedResponse) => Promise<LearningCycleReveal>;
  onComplete: (completion: HypothesisCompletion) => Promise<void>;
}) {
  const storageKey = hypothesisStorageKey(caseId, practice.phase);
  const [cycle, setCycle] = useState<LearningCycleState | null>(() => {
    const restored = restoreLearningCycleState(
      window.sessionStorage.getItem(storageKey),
      practice.prompt.interactionId,
    );
    return restored?.phase === "complete" ? restored : null;
  });
  const [hypothesisId, setHypothesisId] = useState(practice.currentHypothesisId ?? "");
  const [status, setStatus] = useState<"" | "retain" | "revise" | "reject">("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");

  function toggleEvidence(id: string) {
    setEvidenceIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  const canSubmit = practice.phase === "initial"
    ? Boolean(hypothesisId)
    : Boolean(
        status &&
        evidenceIds.length > 0 &&
        (status !== "revise" || (hypothesisId && hypothesisId !== practice.currentHypothesisId)),
      );

  async function submit() {
    if (!cycle || !canSubmit || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      await onComplete({
        phase: practice.phase,
        cycle,
        hypothesisId: status === "reject" ? null : hypothesisId,
        ...(practice.phase === "update" ? { status: status as "retain" | "revise" | "reject" } : {}),
        evidenceIds,
      });
      setSaveStatus("idle");
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <section className={styles.card} aria-label={`${practice.phase} hypothesis`}>
      <span>Hypothesis · {practice.phase}</span>
      <h2>{practice.phase === "initial" ? "Form an initial hypothesis" : "Update your hypothesis"}</h2>
      {!cycle && (
        <GeneratedResponseCycle
          prompt={practice.prompt}
          storageKey={storageKey}
          onCommit={(response) => onCommit(practice.phase, response)}
          onComplete={setCycle}
        />
      )}
      {cycle && practice.phase === "initial" && (
        <div className={styles.form}>
          <label>Initial hypothesis<select value={hypothesisId} onChange={(event) => setHypothesisId(event.target.value)}><option value="">Choose a testable hypothesis</option>{practice.options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
          <button type="button" disabled={!canSubmit || saveStatus === "saving"} onClick={() => void submit()}>Start investigation</button>
        </div>
      )}
      {cycle && practice.phase === "update" && (
        <div className={styles.form}>
          <fieldset>
            <legend>Evidence supporting this update</legend>
            {facts.map((fact) => <label key={fact.id}><input type="checkbox" checked={evidenceIds.includes(fact.id)} onChange={() => toggleEvidence(fact.id)} />{fact.text}</label>)}
          </fieldset>
          <label>Update decision<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="">Choose retain, revise, or reject</option><option value="retain">Retain the current hypothesis</option><option value="revise">Revise to a different hypothesis</option><option value="reject">Reject it without a replacement yet</option></select></label>
          {status === "revise" && <label>Revised hypothesis<select value={hypothesisId} onChange={(event) => setHypothesisId(event.target.value)}><option value="">Choose a revised hypothesis</option>{practice.options.filter(({ id }) => id !== practice.currentHypothesisId).map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>}
          <button type="button" disabled={!canSubmit || saveStatus === "saving"} onClick={() => void submit()}>Save hypothesis update</button>
        </div>
      )}
      {saveStatus === "error" && <p role="alert">Your hypothesis was not saved. Try again.</p>}
    </section>
  );
}
