"use client";

import { bindLearnerStorage } from "@/data/learner-identity";

import { useState } from "react";
import { useStableChoiceOrder } from "@/components/forms/useStableChoiceOrder";
import { GeneratedResponseCycle } from "@/components/practice/GeneratedResponseCycle";
import { restoreLearningCycleState, type LearningCycleReveal, type LearningCycleState } from "@/core/learning-cycle";
import type { LearnerSessionView } from "@/core/learner-case";
import type { CommittedResponse } from "@/core/schema";
import type { RevealedFact } from "@/core/case-engine";
import type { CaseMode } from "@/core/v3-taxonomy";
import styles from "./HypothesisStep.module.css";

type HypothesisPractice = NonNullable<LearnerSessionView["hypothesis"]>;

function hypothesisStorageKey(caseId: string, mode: CaseMode, phase: "initial" | "update") {
  const base = `casework:guest-session:${caseId}:hypothesis:${phase}`;
  return mode === "practice" ? base : `${base}:${mode}`;
}

export function clearHypothesisPracticeStorage(
  storage: Pick<Storage, "removeItem">,
  caseId: string,
  mode: CaseMode = "practice",
  storageScope = "",
) {
  storage.removeItem((hypothesisStorageKey(caseId, mode, "initial") + storageScope));
  storage.removeItem((hypothesisStorageKey(caseId, mode, "update") + storageScope));
  storage.removeItem(`${(hypothesisStorageKey(caseId, mode, "initial") + storageScope)}:options`);
  storage.removeItem(`${(hypothesisStorageKey(caseId, mode, "update") + storageScope)}:options`);
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
  caseMode = "practice",
  storageScope = "",
  onCommit,
  onComplete,
}: {
  caseId: string;
  practice: HypothesisPractice;
  facts: RevealedFact[];
  caseMode?: CaseMode;
  storageScope?: string;
  onCommit: (phase: "initial" | "update", response: CommittedResponse) => Promise<{
    reveal: LearningCycleReveal;
    options: Array<{ id: string; label: string }>;
  }>;
  onComplete: (completion: HypothesisCompletion) => Promise<void>;
}) {
  const [draftStorage] = useState(bindLearnerStorage);
  const storageKey = hypothesisStorageKey(caseId, caseMode, practice.phase) + storageScope;
  const optionsStorageKey = `${storageKey}:options`;
  const [cycle, setCycle] = useState<LearningCycleState | null>(() => {
    const restored = restoreLearningCycleState(
      draftStorage.getItem(storageKey),
      practice.prompt.interactionId,
    );
    return restored?.phase === "complete" ? restored : null;
  });
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>(() => {
    try {
      return JSON.parse(draftStorage.getItem(optionsStorageKey) ?? "[]") as Array<{ id: string; label: string }>;
    } catch {
      return [];
    }
  });
  const [hypothesisId, setHypothesisId] = useState(practice.currentHypothesisId ?? "");
  const [status, setStatus] = useState<"" | "retain" | "revise" | "reject">("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const orderedOptions = useStableChoiceOrder(
    options,
    `casework:choice-seed:case:${caseId}${caseMode === "practice" ? "" : `:${caseMode}`}`,
    `hypothesis:${practice.phase}`,
  );

  async function commitResponse(response: CommittedResponse) {
    const committed = await onCommit(practice.phase, response);
    setOptions(committed.options);
    draftStorage.setItem(optionsStorageKey, JSON.stringify(committed.options));
    return committed.reveal;
  }

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
          onCommit={commitResponse}
          onComplete={setCycle}
          deferComparison={caseMode === "interview"}
        />
      )}
      {cycle && practice.phase === "initial" && (
        <div className={styles.form}>
          <label>Initial hypothesis<select value={hypothesisId} onChange={(event) => setHypothesisId(event.target.value)}><option value="">Choose a testable hypothesis</option>{orderedOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
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
          {status === "revise" && <label>Revised hypothesis<select value={hypothesisId} onChange={(event) => setHypothesisId(event.target.value)}><option value="">Choose a revised hypothesis</option>{orderedOptions.filter(({ id }) => id !== practice.currentHypothesisId).map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>}
          <button type="button" disabled={!canSubmit || saveStatus === "saving"} onClick={() => void submit()}>Save hypothesis update</button>
        </div>
      )}
      {saveStatus === "error" && <p role="alert">Your hypothesis was not saved. Try again.</p>}
    </section>
  );
}
