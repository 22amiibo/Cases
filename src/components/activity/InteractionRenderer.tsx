"use client";

import { useState } from "react";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import { BrainstormBuilder } from "./BrainstormBuilder";
import { ExhibitChain } from "./ExhibitChain";
import { HypothesisSequence } from "./HypothesisSequence";

type Choice = { id: string; label: string };
export type LearnerInteraction =
  | { type: "single_select"; interactionId: string; prompt: string; options: Choice[] }
  | { type: "multi_select"; interactionId: string; prompt: string; options: Choice[] }
  | { type: "ranking"; interactionId: string; prompt: string; items: Choice[] }
  | {
      type: "categorization";
      interactionId: string;
      prompt: string;
      categories: Choice[];
      items: Choice[];
    }
  | {
      type: "brainstorm_builder";
      interactionId: string;
      prompt: string;
      categories: Choice[];
      ideas: Choice[];
      maximumPriorityIdeas: number;
    }
  | {
      type: "hypothesis_sequence";
      interactionId: string;
      prompt: string;
      hypotheses: Choice[];
      phase: "initial" | "update";
      stepId: string;
      currentHypothesisId: string | null;
      evidence?: { id: string; evidenceId: string; text: string };
    }
  | {
      type: "exhibit_chain";
      interactionId: string;
      prompt: string;
      stage: "observe" | "prioritize" | "interpret" | "act";
      options: Choice[];
    };

export type InteractionCommit =
  | { type: "selection_committed"; interactionId: string; selectedIds: string[] }
  | { type: "ranking_committed"; interactionId: string; orderedIds: string[] }
  | {
      type: "categorization_committed";
      interactionId: string;
      placements: Array<{ itemId: string; categoryId: string }>;
    }
  | {
      type: "brainstorm_committed";
      interactionId: string;
      selectedIdeaIds: string[];
      placements: Array<{ ideaId: string; categoryId: string }>;
      priorityIdeaIds: string[];
    }
  | {
      type: "hypothesis_committed";
      interactionId: string;
      stepId: string;
      status: "form" | "retain" | "revise" | "reject";
      hypothesisId: string | null;
      evidenceIds: string[];
      rationale: string;
    }
  | {
      type: "exhibit_committed";
      interactionId: string;
      stage: "observe" | "prioritize" | "interpret" | "act";
      selectedIds: string[];
      response?: string;
    };

export function InteractionRenderer({
  interaction,
  onCommit,
  disabled,
  exhibit,
}: {
  interaction: LearnerInteraction;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
  exhibit?: LearnerExhibitDefinition;
}) {
  if (interaction.type === "single_select" || interaction.type === "multi_select") {
    return <SelectInteraction
      key={`${interaction.type}:${interaction.interactionId}`}
      interaction={interaction}
      onCommit={onCommit}
      disabled={disabled}
    />;
  }
  if (interaction.type === "ranking") {
    return <RankingInteraction
      key={interaction.interactionId}
      interaction={interaction}
      onCommit={onCommit}
      disabled={disabled}
    />;
  }
  if (interaction.type === "brainstorm_builder") {
    return <BrainstormBuilder interaction={interaction} onCommit={onCommit} disabled={disabled} />;
  }
  if (interaction.type === "hypothesis_sequence") {
    return <HypothesisSequence interaction={interaction} onCommit={onCommit} disabled={disabled} />;
  }
  if (interaction.type === "exhibit_chain") {
    return exhibit
      ? <ExhibitChain interaction={interaction} exhibit={exhibit} onCommit={onCommit} disabled={disabled} />
      : <p role="alert">The exhibit is unavailable.</p>;
  }
  return <CategorizationInteraction
    key={interaction.interactionId}
    interaction={interaction}
    onCommit={onCommit}
    disabled={disabled}
  />;
}

function SelectInteraction({
  interaction,
  onCommit,
  disabled,
}: {
  interaction: Extract<LearnerInteraction, { type: "single_select" | "multi_select" }>;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const multiple = interaction.type === "multi_select";
  return (
    <fieldset>
      <legend>{interaction.prompt}</legend>
      {interaction.options.map((option) => (
        <label key={option.id}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={interaction.interactionId}
            checked={selectedIds.includes(option.id)}
            onChange={() => setSelectedIds((current) => multiple
              ? current.includes(option.id)
                ? current.filter((id) => id !== option.id)
                : [...current, option.id]
              : [option.id])}
          />
          {option.label}
        </label>
      ))}
      <button
        type="button"
        disabled={disabled || selectedIds.length === 0}
        onClick={() => onCommit({
          type: "selection_committed",
          interactionId: interaction.interactionId,
          selectedIds,
        })}
      >Commit answer</button>
    </fieldset>
  );
}

function RankingInteraction({
  interaction,
  onCommit,
  disabled,
}: {
  interaction: Extract<LearnerInteraction, { type: "ranking" }>;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
}) {
    const [order, setOrder] = useState(() => interaction.items.map(({ id }) => id));
    const move = (index: number, direction: -1 | 1) => {
      const destination = index + direction;
      if (destination < 0 || destination >= order.length) return;
      const next = [...order];
      [next[index], next[destination]] = [next[destination], next[index]];
      setOrder(next);
    };
    return (
      <section aria-label={interaction.prompt}>
        <h2>{interaction.prompt}</h2>
        <ol>
          {order.map((id, index) => {
            const item = interaction.items.find((candidate) => candidate.id === id)!;
            return <li key={id}>
              <span>{item.label}</span>
              <button type="button" aria-label={`Move ${item.label} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>Up</button>
              <button type="button" aria-label={`Move ${item.label} down`} disabled={disabled || index === order.length - 1} onClick={() => move(index, 1)}>Down</button>
            </li>;
          })}
        </ol>
        <button type="button" disabled={disabled} onClick={() => onCommit({
          type: "ranking_committed",
          interactionId: interaction.interactionId,
          orderedIds: order,
        })}>Commit ranking</button>
      </section>
    );
}

function CategorizationInteraction({
  interaction,
  onCommit,
  disabled,
}: {
  interaction: Extract<LearnerInteraction, { type: "categorization" }>;
  onCommit: (event: InteractionCommit) => void;
  disabled: boolean;
}) {
    const [placements, setPlacements] = useState<Record<string, string>>({});
    return (
      <fieldset>
        <legend>{interaction.prompt}</legend>
        {interaction.items.map((item) => (
          <label key={item.id}>
            {item.label}
            <select
              value={placements[item.id] ?? ""}
              onChange={(event) => setPlacements((current) => ({
                ...current,
                [item.id]: event.target.value,
              }))}
            >
              <option value="">Choose a category</option>
              {interaction.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </label>
        ))}
        <button
          type="button"
          disabled={disabled || interaction.items.some(({ id }) => !placements[id])}
          onClick={() => onCommit({
            type: "categorization_committed",
            interactionId: interaction.interactionId,
            placements: interaction.items.map(({ id }) => ({
              itemId: id,
              categoryId: placements[id],
            })),
          })}
        >Commit categories</button>
      </fieldset>
    );
}
