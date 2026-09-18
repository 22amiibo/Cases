"use client";

import { useState } from "react";
import { ExhibitRenderer } from "@/components/exhibits/ExhibitRenderer";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import type { InteractionCommit } from "./InteractionRenderer";

type ExhibitInteraction = {
  interactionId: string;
  prompt: string;
  stage: "observe" | "prioritize" | "interpret" | "act";
  options: Array<{ id: string; label: string }>;
};

export function ExhibitChain({
  interaction,
  exhibit,
  onCommit,
  disabled,
}: {
  interaction: ExhibitInteraction;
  exhibit: LearnerExhibitDefinition;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [response, setResponse] = useState("");
  const needsResponse = interaction.stage === "observe" || interaction.stage === "interpret";
  return <div>
    <ExhibitRenderer definition={exhibit} revealed />
    <fieldset>
      <legend>{interaction.stage[0].toUpperCase() + interaction.stage.slice(1)}</legend>
      {interaction.options.map((option) => <label key={option.id}>
        <input type="radio" name={`exhibit-${interaction.stage}`} checked={selectedId === option.id} onChange={() => setSelectedId(option.id)} />
        {option.label}
      </label>)}
      {needsResponse && <label>Your reasoning<textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={4} /></label>}
      <button
        type="button"
        disabled={disabled || !selectedId || (needsResponse && !response.trim())}
        onClick={() => onCommit({
          type: "exhibit_committed",
          interactionId: interaction.interactionId,
          stage: interaction.stage,
          selectedIds: [selectedId],
          ...(needsResponse ? { response: response.trim() } : {}),
        })}
      >Commit {interaction.stage}</button>
    </fieldset>
  </div>;
}
