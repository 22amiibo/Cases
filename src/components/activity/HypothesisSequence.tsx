"use client";

import { useState } from "react";
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
}: {
  interaction: HypothesisInteraction;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
}) {
  const [hypothesisId, setHypothesisId] = useState(interaction.currentHypothesisId ?? "");
  const [status, setStatus] = useState<"retain" | "revise" | "reject">("retain");
  const [cited, setCited] = useState(false);
  const [rationale, setRationale] = useState("");
  const initial = interaction.phase === "initial";

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
        {interaction.hypotheses.map((hypothesis) => <label key={hypothesis.id}>
          <input type="radio" name="hypothesis" checked={hypothesisId === hypothesis.id} onChange={() => setHypothesisId(hypothesis.id)} />
          {hypothesis.label}
        </label>)}
      </fieldset>}
      <label>Rationale<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={4} /></label>
      <button
        type="button"
        disabled={disabled || !rationale.trim() || (status !== "reject" && !hypothesisId)}
        onClick={() => onCommit({
          type: "hypothesis_committed",
          interactionId: interaction.interactionId,
          stepId: interaction.stepId,
          status: initial ? "form" : status,
          hypothesisId: !initial && status === "reject" ? null : hypothesisId,
          evidenceIds: interaction.evidence && cited ? [interaction.evidence.evidenceId] : [],
          rationale: rationale.trim(),
        })}
      >{initial ? "Commit hypothesis" : "Commit update"}</button>
    </fieldset>
  );
}
