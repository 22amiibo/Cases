"use client";

import { useState } from "react";
import type { InteractionCommit } from "./InteractionRenderer";

type BrainstormInteraction = {
  interactionId: string;
  prompt: string;
  categories: Array<{ id: string; label: string }>;
  ideas: Array<{ id: string; label: string }>;
  maximumPriorityIdeas: number;
};

export function BrainstormBuilder({
  interaction,
  onCommit,
  disabled,
}: {
  interaction: BrainstormInteraction;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [priorities, setPriorities] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((current) => current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id]);

  return (
    <fieldset>
      <legend>{interaction.prompt}</legend>
      {interaction.ideas.map((idea) => (
        <div key={idea.id}>
          <label>
            <input type="checkbox" checked={selected.includes(idea.id)} onChange={() => toggle(idea.id)} />
            {idea.label}
          </label>
          {selected.includes(idea.id) && <>
            <label>
              Category for {idea.label}
              <select value={placements[idea.id] ?? ""} onChange={(event) => setPlacements((current) => ({ ...current, [idea.id]: event.target.value }))}>
                <option value="">Choose a category</option>
                {interaction.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={priorities.includes(idea.id)}
                disabled={!priorities.includes(idea.id) && priorities.length >= interaction.maximumPriorityIdeas}
                onChange={() => setPriorities((current) => current.includes(idea.id)
                  ? current.filter((value) => value !== idea.id)
                  : [...current, idea.id])}
              />
              Prioritize {idea.label}
            </label>
          </>}
        </div>
      ))}
      <button
        type="button"
        disabled={disabled || selected.length === 0 || priorities.length === 0 || selected.some((id) => !placements[id])}
        onClick={() => onCommit({
          type: "brainstorm_committed",
          interactionId: interaction.interactionId,
          selectedIdeaIds: selected,
          placements: selected.map((ideaId) => ({ ideaId, categoryId: placements[ideaId] })),
          priorityIdeaIds: priorities,
        })}
      >Commit brainstorm</button>
    </fieldset>
  );
}
