"use client";

import { useState } from "react";
import { ExhibitRenderer } from "@/components/exhibits/ExhibitRenderer";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import { useStableChoiceOrder } from "@/components/forms/useStableChoiceOrder";
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
  orderSeedKey,
}: {
  interaction: ExhibitInteraction;
  exhibit: LearnerExhibitDefinition;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
  orderSeedKey: string;
}) {
  const [selectedId, setSelectedId] = useState("");
  const options = useStableChoiceOrder(
    interaction.options,
    orderSeedKey,
    `${interaction.interactionId}:${interaction.stage}`,
  );
  return <div>
    <ExhibitRenderer definition={exhibit} revealed />
    <fieldset>
      <legend>{interaction.stage[0].toUpperCase() + interaction.stage.slice(1)}</legend>
      {options.map((option) => <label key={option.id}>
        <input type="radio" name={`exhibit-${interaction.stage}`} checked={selectedId === option.id} onChange={() => setSelectedId(option.id)} />
        {option.label}
      </label>)}
      <button
        type="button"
        disabled={disabled || !selectedId}
        onClick={() => onCommit({
          type: "exhibit_committed",
          interactionId: interaction.interactionId,
          stage: interaction.stage,
          selectedIds: [selectedId],
        })}
      >Commit {interaction.stage}</button>
    </fieldset>
  </div>;
}
