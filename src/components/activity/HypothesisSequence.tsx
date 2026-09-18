"use client";

import { useState } from "react";
import { useStableChoiceOrder } from "@/components/forms/useStableChoiceOrder";
import type { InteractionCommit } from "./InteractionRenderer";

type HypothesisInteraction = {
  interactionId: string;
  prompt: string;
  hypotheses: Array<{ id: string; label: string }>;
  phase: "initial" | "update";
  stepId: string;
  currentHypothesisId: string | null;
  evidence?: { id: string; evidenceId: string; text: string };
};

export function HypothesisSequence({
  interaction,
  onCommit,
  disabled,
  orderSeedKey,
}: {
  interaction: HypothesisInteraction;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
  orderSeedKey: string;
}) {
  const [hypothesisId, setHypothesisId] = useState(interaction.currentHypothesisId ?? "");
  const [status, setStatus] = useState<"retain" | "revise" | "reject">("retain");
  const [cited, setCited] = useState(false);
  const [reasoning, setReasoning] = useState("");
  const initial = interaction.phase === "initial";
  const reasoningOptions = {
    supports: "The evidence supports the current hypothesis.",
    contradicts: "The evidence contradicts the prior hypothesis.",
    insufficient: "The evidence is not enough to change the hypothesis.",
  } as const;
  const hypotheses = useStableChoiceOrder(
    interaction.hypotheses,
    orderSeedKey,
    `${interaction.interactionId}:${interaction.stepId}`,
  );

  return (
    <fieldset>
      <legend>{initial ? interaction.prompt : "Update the hypothesis using the new evidence"}</legend>
      {interaction.evidence && <section aria-label="New evidence">
        <h3>New evidence</h3><p>{interaction.evidence.text}</p>
        <label><input type="checkbox" checked={cited} onChange={(event) => setCited(event.target.checked)} />Use this evidence in the update</label>
      </section>}
      {!initial && <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
        <option value="retain">Retain</option><option value="revise">Revise</option><option value="reject">Reject</option>
      </select></label>}
      {(initial || status !== "reject") && <fieldset>
        <legend>{initial ? "Starting hypothesis" : "Current hypothesis"}</legend>
        {hypotheses.map((hypothesis) => <label key={hypothesis.id}>
          <input type="radio" name="hypothesis" checked={hypothesisId === hypothesis.id} onChange={() => setHypothesisId(hypothesis.id)} />
          {hypothesis.label}
        </label>)}
      </fieldset>}
      {!initial && <label>Reasoning<select value={reasoning} onChange={(event) => setReasoning(event.target.value)}>
        <option value="">Choose how the evidence changes the claim</option>
        {Object.entries(reasoningOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>}
      <button
        type="button"
        disabled={disabled || (!initial && !reasoning) || (status !== "reject" && !hypothesisId)}
        onClick={() => onCommit({
          type: "hypothesis_committed",
          interactionId: interaction.interactionId,
          stepId: interaction.stepId,
          status: initial ? "form" : status,
          hypothesisId: !initial && status === "reject" ? null : hypothesisId,
          evidenceIds: interaction.evidence && cited ? [interaction.evidence.evidenceId] : [],
          rationale: initial
            ? "Starting hypothesis selected"
            : reasoningOptions[reasoning as keyof typeof reasoningOptions],
        })}
      >{initial ? "Commit hypothesis" : "Commit update"}</button>
    </fieldset>
  );
}
