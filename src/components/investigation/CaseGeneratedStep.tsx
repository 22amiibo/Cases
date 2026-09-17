"use client";

import { useState } from "react";
import { GeneratedResponseCycle } from "@/components/practice/GeneratedResponseCycle";
import type { RevealedFact } from "@/core/case-engine";
import type { CaseCycleKind } from "@/core/case-learning";
import {
  restoreLearningCycleState,
  type LearnerLearningCyclePrompt,
  type LearningCycleReveal,
  type LearningCycleState,
} from "@/core/learning-cycle";
import type { CaseEvent, CommittedResponse } from "@/core/schema";
import styles from "./HypothesisStep.module.css";

type Choice = { id: string; label: string };
type CheckpointReveal = {
  questionOptions?: Choice[];
  decisions?: Choice[];
  risks?: Choice[];
  nextSteps?: Choice[];
};

function storageKey(caseId: string, kind: CaseCycleKind, itemId?: string) {
  return `casework:guest-session:${caseId}:cycle:${kind}:${itemId ?? "main"}`;
}

export function clearCaseCycleStorage(
  storage: Storage,
  caseId: string,
) {
  const casePrefix = `casework:guest-session:${caseId}:cycle:`;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && (key.startsWith(casePrefix) || key.startsWith("casework:exhibit-cycle:"))) {
      keys.push(key);
    }
  }
  keys.forEach((key) => storage.removeItem(key));
}

export function CaseGeneratedStep({
  caseId,
  contentVersion,
  kind,
  itemId,
  prompt,
  events,
  facts = [],
  actions = [],
  unit,
  atMs,
  onEvent,
}: {
  caseId: string;
  contentVersion: number;
  kind: CaseCycleKind;
  itemId?: string;
  prompt: LearnerLearningCyclePrompt;
  events: CaseEvent[];
  facts?: RevealedFact[];
  actions?: Choice[];
  unit?: string;
  atMs: () => number;
  onEvent: (event: CaseEvent) => Promise<void>;
}) {
  const key = storageKey(caseId, kind, itemId);
  const [cycle, setCycle] = useState<LearningCycleState | null>(() => {
    const restored = restoreLearningCycleState(window.sessionStorage.getItem(key), prompt.interactionId);
    return restored?.phase === "complete" ? restored : null;
  });
  const [reveal, setReveal] = useState<CheckpointReveal>(() => {
    try { return JSON.parse(window.sessionStorage.getItem(`${key}:checkpoint`) ?? "{}"); } catch { return {}; }
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [nextStepNodeId, setNextStepNodeId] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const [riskId, setRiskId] = useState("");
  const [nextStepId, setNextStepId] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  function toggle(id: string, max = 3) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length < max ? [...current, id] : current);
  }

  async function commit(response: CommittedResponse): Promise<LearningCycleReveal> {
    const result = await fetch(`/api/cases/${caseId}/cycle/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentVersion, events, kind, itemId, response }),
    });
    if (!result.ok) throw new Error("Unable to commit response");
    const payload = await result.json() as { reveal: LearningCycleReveal; checkpoint: CheckpointReveal | null };
    const checkpoint = payload.checkpoint ?? {};
    setReveal(checkpoint);
    window.sessionStorage.setItem(`${key}:checkpoint`, JSON.stringify(checkpoint));
    return payload.reveal;
  }

  async function complete() {
    if (!cycle || status === "saving") return;
    const checkpoint: Record<string, unknown> = kind === "opening"
      ? { questionIds: selectedIds }
      : kind === "calculation"
        ? { answer: Number(answer), unit }
        : kind === "synthesis"
          ? { evidenceIds: selectedIds, nextStepNodeId }
          : { decisionId, evidenceIds: selectedIds, riskId, nextStepId };
    setStatus("saving");
    try {
      const result = await fetch(`/api/cases/${caseId}/cycle/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentVersion, events, kind, itemId, cycle, checkpoint, atMs: atMs() }),
      });
      if (!result.ok) throw new Error("Unable to complete practice");
      const payload = await result.json() as { event: CaseEvent };
      await onEvent(payload.event);
      window.sessionStorage.removeItem(key);
      window.sessionStorage.removeItem(`${key}:checkpoint`);
    } catch {
      setStatus("error");
    }
  }

  const canComplete = kind === "opening"
    ? selectedIds.length > 0
    : kind === "calculation"
      ? Number.isFinite(Number(answer)) && answer.trim() !== ""
      : kind === "synthesis"
        ? selectedIds.length > 0 && Boolean(nextStepNodeId)
        : Boolean(decisionId && selectedIds.length > 0 && riskId && nextStepId);

  return (
    <section className={styles.card} aria-label={`${kind} practice`}>
      <span>Case practice · {kind}</span>
      {!cycle && <GeneratedResponseCycle prompt={prompt} storageKey={key} onCommit={commit} onComplete={setCycle} allowSkip={false} />}
      {cycle && (
        <div className={styles.form}>
          {kind === "opening" && <fieldset><legend>Choose the questions you would ask</legend>{reveal.questionOptions?.map((choice) => <label key={choice.id}><input type="checkbox" checked={selectedIds.includes(choice.id)} onChange={() => toggle(choice.id, 4)} />{choice.label}</label>)}</fieldset>}
          {kind === "calculation" && <label>Calculated answer ({unit})<input inputMode="decimal" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>}
          {kind === "synthesis" && <><fieldset><legend>Evidence supporting your synthesis</legend>{facts.map((fact) => <label key={fact.id}><input type="checkbox" checked={selectedIds.includes(fact.id)} onChange={() => toggle(fact.id)} />{fact.text}</label>)}</fieldset><label>Next investigation<select value={nextStepNodeId} onChange={(event) => setNextStepNodeId(event.target.value)}><option value="">Choose a next step</option>{actions.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label></>}
          {kind === "recommendation" && <><label>Decision<select value={decisionId} onChange={(event) => setDecisionId(event.target.value)}><option value="">Choose a decision</option>{reveal.decisions?.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label><fieldset><legend>Supporting evidence</legend>{facts.map((fact) => <label key={fact.id}><input type="checkbox" checked={selectedIds.includes(fact.id)} onChange={() => toggle(fact.id)} />{fact.text}</label>)}</fieldset><label>Risk<select value={riskId} onChange={(event) => setRiskId(event.target.value)}><option value="">Choose a risk</option>{reveal.risks?.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label><label>Next step<select value={nextStepId} onChange={(event) => setNextStepId(event.target.value)}><option value="">Choose a next step</option>{reveal.nextSteps?.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label></>}
          <button type="button" disabled={!canComplete || status === "saving"} onClick={() => void complete()}>{status === "saving" ? "Saving" : `Save ${kind}`}</button>
          {status === "error" && <p role="alert">This step was not saved. Try again.</p>}
        </div>
      )}
    </section>
  );
}
