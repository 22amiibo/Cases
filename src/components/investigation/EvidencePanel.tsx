"use client";

import { useState } from "react";
import { ExhibitRenderer } from "@/components/exhibits/ExhibitRenderer";
import { GeneratedResponseCycle } from "@/components/practice/GeneratedResponseCycle";
import type { LearnerExhibitDefinition } from "@/core/learner-case";
import type { RevealedFact } from "@/core/case-engine";
import {
  restoreLearningCycleState,
  type LearningCycleReveal,
  type LearningCycleState,
} from "@/core/learning-cycle";
import type { CaseEvent, CommittedResponse } from "@/core/schema";
import styles from "./EvidencePanel.module.css";

type EvidencePanelProps = {
  facts: RevealedFact[];
  exhibits: LearnerExhibitDefinition[];
  interpretedExhibitIds?: string[];
  onCommitResponse?: (
    exhibitId: string,
    response: CommittedResponse,
  ) => Promise<{
    reveal: LearningCycleReveal;
    insightOptions: Array<{ id: string; label: string }>;
  }>;
  onSubmitInterpretation?: (
    submission: Omit<
      Extract<CaseEvent, { type: "exhibit_interpretation_submitted" }>,
      "type" | "eventSchemaVersion" | "atMs"
    >,
  ) => Promise<void>;
};

export function EvidencePanel({
  facts,
  exhibits,
  interpretedExhibitIds = [],
  onCommitResponse,
  onSubmitInterpretation,
}: EvidencePanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="evidence-title">
      <div className={styles.heading}>
        <span>Evidence desk</span>
        <h2 id="evidence-title">What you know now</h2>
      </div>

      {facts.length === 0 ? (
        <p className={styles.empty}>
          Select a structured investigation to reveal authored evidence.
        </p>
      ) : (
        <ul className={styles.facts}>
          {facts.map((fact) => (
            <li key={fact.id}>{fact.text}</li>
          ))}
        </ul>
      )}

      <div className={styles.exhibits}>
        {exhibits.map((exhibit) => (
          <div key={exhibit.id}>
            <ExhibitRenderer definition={exhibit} revealed />
            {exhibit.interpretationPrompt &&
              (interpretedExhibitIds.includes(exhibit.id) ? (
                <p role="status">Interpretation committed.</p>
              ) : onCommitResponse && onSubmitInterpretation ? (
                <ExhibitInterpretationPractice
                  exhibit={exhibit}
                  prompt={exhibit.interpretationPrompt}
                  onCommitResponse={onCommitResponse}
                  onSubmitInterpretation={onSubmitInterpretation}
                />
              ) : null)}
          </div>
        ))}
      </div>
    </section>
  );
}

function ExhibitInterpretationPractice({
  exhibit,
  prompt,
  onCommitResponse,
  onSubmitInterpretation,
}: {
  exhibit: LearnerExhibitDefinition;
  prompt: NonNullable<LearnerExhibitDefinition["interpretationPrompt"]>;
  onCommitResponse: NonNullable<EvidencePanelProps["onCommitResponse"]>;
  onSubmitInterpretation: NonNullable<
    EvidencePanelProps["onSubmitInterpretation"]
  >;
}) {
  const cycleStorageKey = `casework:exhibit-cycle:${exhibit.id}`;
  const optionsStorageKey = `${cycleStorageKey}:insights`;
  const [insightOptions, setInsightOptions] = useState<
    Array<{ id: string; label: string }>
  >(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.sessionStorage.getItem(optionsStorageKey) ?? "[]") as Array<{
        id: string;
        label: string;
      }>;
    } catch {
      return [];
    }
  });
  const [completedState, setCompletedState] = useState<LearningCycleState | null>(
    () => {
      if (typeof window === "undefined") return null;
      const restored = restoreLearningCycleState(
        window.sessionStorage.getItem(cycleStorageKey),
        prompt.interactionId,
      );
      return restored?.phase === "complete" ? restored : null;
    },
  );
  const [insightId, setInsightId] = useState("");

  return (
    <div>
      <GeneratedResponseCycle
        prompt={prompt}
        storageKey={cycleStorageKey}
        onCommit={async (response) => {
          const result = await onCommitResponse(exhibit.id, response);
          setInsightOptions(result.insightOptions);
          window.sessionStorage.setItem(
            optionsStorageKey,
            JSON.stringify(result.insightOptions),
          );
          return result.reveal;
        }}
        onComplete={setCompletedState}
      />
      {completedState && insightOptions.length > 0 && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!insightId) return;
            const latest = completedState.responses.at(-1);
            const assessment = completedState.assessments.find(
              (candidate) => candidate.responseId === latest?.responseId,
            );
            void onSubmitInterpretation({
              exhibitId: exhibit.id,
              responses: completedState.responses,
              rubricOutcomes: assessment?.outcomes ?? [],
              diagnostics: completedState.diagnostics,
              insightIds: [insightId],
              authoredComparisonViewed: true,
            }).then(() => {
              window.sessionStorage.removeItem(cycleStorageKey);
              window.sessionStorage.removeItem(optionsStorageKey);
            });
          }}
        >
          <label>
            Which authored insight best matches your interpretation?
            <select
              value={insightId}
              onChange={(event) => setInsightId(event.target.value)}
            >
              <option value="">Choose an insight</option>
              {insightOptions.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={!insightId}>Commit interpretation</button>
        </form>
      )}
    </div>
  );
}
