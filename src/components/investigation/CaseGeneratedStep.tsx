"use client";

import { useState } from "react";
import { ChoiceListbox } from "@/components/forms/ChoiceListbox";
import { useStableChoiceOrder } from "@/components/forms/useStableChoiceOrder";
import { GeneratedResponseCycle } from "@/components/practice/GeneratedResponseCycle";
import type { RevealedFact } from "@/core/case-engine";
import type { CaseCycleKind } from "@/core/case-learning";
import {
  restoreLearningCycleState,
  type LearnerLearningCyclePrompt,
  type LearningCycleReveal,
  type LearningCycleState,
} from "@/core/learning-cycle";
import {
  NO_FURTHER_INVESTIGATION,
  type CaseEvent,
  type CommittedResponse,
} from "@/core/schema";
import type { QuantitativeFeedback } from "@/core/quantitative-feedback";
import type { CaseMode } from "@/core/v3-taxonomy";
import styles from "./HypothesisStep.module.css";

type Choice = { id: string; label: string };
type CheckpointReveal = {
  questionOptions?: Choice[];
  decisions?: Choice[];
  risks?: Choice[];
  nextSteps?: Choice[];
};

function storageKey(caseId: string, mode: CaseMode, kind: CaseCycleKind, itemId?: string) {
  const base = `casework:guest-session:${caseId}:cycle:${kind}:${itemId ?? "main"}`;
  return mode === "practice" ? base : `${base}:${mode}`;
}

export function clearCaseCycleStorage(
  storage: Storage,
  caseId: string,
  mode: CaseMode = "practice",
) {
  const casePrefix = `casework:guest-session:${caseId}:cycle:`;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && (key.startsWith(casePrefix) || key.startsWith("casework:exhibit-cycle:")) &&
      (mode === "practice" ? !key.endsWith(":interview") : key.endsWith(`:${mode}`))) {
      keys.push(key);
    }
  }
  keys.forEach((key) => storage.removeItem(key));
}

export function CaseGeneratedStep({
  caseId,
  contentVersion,
  caseMode = "practice",
  kind,
  itemId,
  prompt,
  events,
  facts = [],
  actions = [],
  unitOptions = [],
  atMs,
  onEvent,
  onQuantitativeFeedback,
}: {
  caseId: string;
  contentVersion: number;
  caseMode?: CaseMode;
  kind: CaseCycleKind;
  itemId?: string;
  prompt: LearnerLearningCyclePrompt;
  events: CaseEvent[];
  facts?: RevealedFact[];
  actions?: Choice[];
  unitOptions?: string[];
  atMs: () => number;
  onEvent: (event: CaseEvent) => Promise<void>;
  onQuantitativeFeedback?: (feedback: QuantitativeFeedback) => void;
}) {
  const key = storageKey(caseId, caseMode, kind, itemId);
  const [cycle, setCycle] = useState<LearningCycleState | null>(() => {
    const restored = restoreLearningCycleState(window.sessionStorage.getItem(key), prompt.interactionId);
    return restored?.phase === "complete" ? restored : null;
  });
  const [reveal, setReveal] = useState<CheckpointReveal>(() => {
    try { return JSON.parse(window.sessionStorage.getItem(`${key}:checkpoint`) ?? "{}"); } catch { return {}; }
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [unit, setUnit] = useState("");
  const [nextStepNodeId, setNextStepNodeId] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const [riskId, setRiskId] = useState("");
  const [nextStepId, setNextStepId] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const orderSeedKey = `casework:choice-seed:case:${caseId}:${contentVersion}${caseMode === "practice" ? "" : `:${caseMode}`}`;
  const orderedQuestionOptions = useStableChoiceOrder(
    reveal.questionOptions ?? [],
    orderSeedKey,
    `${kind}:questions`,
  );
  const orderedDecisions = useStableChoiceOrder(
    reveal.decisions ?? [],
    orderSeedKey,
    `${kind}:decisions`,
  );
  const orderedRisks = useStableChoiceOrder(
    reveal.risks ?? [],
    orderSeedKey,
    `${kind}:risks`,
  );
  const orderedNextSteps = useStableChoiceOrder(
    reveal.nextSteps ?? [],
    orderSeedKey,
    `${kind}:next-steps`,
  );
  const orderedUnits = useStableChoiceOrder(
    unitOptions.map((value) => ({ id: value, label: value })),
    orderSeedKey,
    `${kind}:${itemId ?? "main"}:units`,
  );
  const orderedActions = useStableChoiceOrder(
    actions,
    orderSeedKey,
    `${kind}:actions`,
  );

  function toggle(id: string, max = 3) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length < max ? [...current, id] : current);
  }

  async function commit(response: CommittedResponse): Promise<LearningCycleReveal> {
    const result = await fetch(`/api/cases/${caseId}/cycle/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentVersion, mode: caseMode, events, kind, itemId, response }),
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
          ? {
              evidenceIds: selectedIds,
              nextStepNodeId:
                nextStepNodeId || NO_FURTHER_INVESTIGATION,
            }
          : { decisionId, evidenceIds: selectedIds, riskId, nextStepId };
    setStatus("saving");
    try {
      const result = await fetch(`/api/cases/${caseId}/cycle/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentVersion, mode: caseMode, events, kind, itemId, cycle, checkpoint, atMs: atMs() }),
      });
      if (!result.ok) throw new Error("Unable to complete practice");
      const payload = await result.json() as {
        event: CaseEvent;
        feedback?: QuantitativeFeedback;
      };
      if (payload.feedback) onQuantitativeFeedback?.(payload.feedback);
      await onEvent(payload.event);
      window.sessionStorage.removeItem(key);
      window.sessionStorage.removeItem(`${key}:checkpoint`);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const canComplete = kind === "opening"
    ? selectedIds.length > 0
    : kind === "calculation"
      ? Number.isFinite(Number(answer)) && answer.trim() !== "" && Boolean(unit)
      : kind === "synthesis"
        ? selectedIds.length > 0 && (
            orderedActions.length === 0 || Boolean(nextStepNodeId)
          )
        : Boolean(decisionId && selectedIds.length > 0 && riskId && nextStepId);

  return (
    <section className={styles.card} aria-label={`${kind} practice`}>
      <span>Case practice · {kind}</span>
      {!cycle && <GeneratedResponseCycle prompt={prompt} storageKey={key} onCommit={commit} onComplete={setCycle} allowSkip={false} deferComparison={caseMode === "interview"} />}
      {cycle && (
        <div className={styles.form}>
          {kind === "opening" && <fieldset><legend>Choose the questions you would ask</legend>{orderedQuestionOptions.map((choice) => <label key={choice.id}><input type="checkbox" checked={selectedIds.includes(choice.id)} onChange={() => toggle(choice.id, 4)} />{choice.label}</label>)}</fieldset>}
          {kind === "calculation" && <><label>Calculated answer<input aria-label="Calculated answer" inputMode="decimal" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label><ChoiceListbox label="Unit" value={unit} placeholder="Choose a unit" options={orderedUnits} onChange={setUnit} /></>}
          {kind === "synthesis" && <><fieldset><legend>Evidence supporting your synthesis</legend>{facts.map((fact) => <label key={fact.id}><input type="checkbox" checked={selectedIds.includes(fact.id)} onChange={() => toggle(fact.id)} />{fact.text}</label>)}</fieldset>{orderedActions.length > 0 ? <label>Next investigation<select value={nextStepNodeId} onChange={(event) => setNextStepNodeId(event.target.value)}><option value="">Choose a next step</option>{orderedActions.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label> : <p role="status">All authored investigations are complete. Continue when your evidence is ready.</p>}</>}
          {kind === "recommendation" && <><label>Decision<select value={decisionId} onChange={(event) => setDecisionId(event.target.value)}><option value="">Choose a decision</option>{orderedDecisions.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label><fieldset><legend>Supporting evidence</legend>{facts.map((fact) => <label key={fact.id}><input type="checkbox" checked={selectedIds.includes(fact.id)} onChange={() => toggle(fact.id)} />{fact.text}</label>)}</fieldset><label>Risk<select value={riskId} onChange={(event) => setRiskId(event.target.value)}><option value="">Choose a risk</option>{orderedRisks.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label><label>Next step<select value={nextStepId} onChange={(event) => setNextStepId(event.target.value)}><option value="">Choose a next step</option>{orderedNextSteps.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label></>}
          <button type="button" disabled={!canComplete || status === "saving"} onClick={() => void complete()}>{status === "saving" ? "Saving" : `Save ${kind}`}</button>
          {status === "error" && <p role="alert">This step was not saved. Try again.</p>}
        </div>
      )}
    </section>
  );
}
