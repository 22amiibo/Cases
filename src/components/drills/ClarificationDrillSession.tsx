"use client";

import { useState, useSyncExternalStore } from "react";
import type { ComponentProps } from "react";
import { GeneratedResponseCycle } from "@/components/practice/GeneratedResponseCycle";
import { useStableChoiceOrder } from "@/components/forms/useStableChoiceOrder";
import type { projectClarificationDrill } from "@/core/clarification-drill";
import {
  restoreLearningCycleState,
  type LearningCycleReveal,
  type LearningCycleState,
} from "@/core/learning-cycle";
import type { DiagnosticOutcome } from "@/core/schema";
import { createV2ClarificationAttempt } from "@/data/attempts";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { PracticeRepository } from "@/data/repository";
import styles from "./DrillSession.module.css";

type LearnerDefinition = ReturnType<typeof projectClarificationDrill>;

export function ClarificationDrillSession(props: {
  definition: LearnerDefinition;
  repository?: PracticeRepository;
  userId?: string;
  createAttemptId?: () => string;
  now?: () => Date;
}) {
  const ready = useSyncExternalStore(() => () => undefined, () => true, () => false);
  if (!ready) return null;
  return <HydratedClarificationDrillSession {...props} />;
}

function HydratedClarificationDrillSession({
  definition,
  repository,
  userId,
  createAttemptId = () => crypto.randomUUID(),
  now = () => new Date(),
}: {
  definition: LearnerDefinition;
  repository?: PracticeRepository;
  userId?: string;
  createAttemptId?: () => string;
  now?: () => Date;
}) {
  const optionsKey = `casework:v2-drill:${definition.id}:questions`;
  const cycleKey = `casework:v2-drill:${definition.id}:cycle`;
  const [questionOptions, setQuestionOptions] = useState<Array<{ id: string; label: string }>>(
    () => {
      try {
        return JSON.parse(window.sessionStorage.getItem(optionsKey) ?? "[]") as Array<{ id: string; label: string }>;
      } catch {
        return [];
      }
    },
  );
  const [cycle, setCycle] = useState<LearningCycleState | null>(() => {
    const restored = restoreLearningCycleState(
      window.sessionStorage.getItem(cycleKey),
      definition.responsePrompt.interactionId,
    );
    return restored?.phase === "complete" ? restored : null;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<{
    responses: Array<{ questionId: string; response: string }>;
    diagnostics: DiagnosticOutcome[];
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const orderedQuestionOptions = useStableChoiceOrder(
    questionOptions,
    `casework:choice-seed:v2-drill:${definition.id}`,
    "questions",
  );

  async function commitResponse(response: Parameters<
    ComponentProps<typeof GeneratedResponseCycle>["onCommit"]
  >[0]): Promise<LearningCycleReveal> {
    const request = await fetch(`/api/drills/${definition.id}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
    if (!request.ok) throw new Error("Unable to commit response");
    const payload = (await request.json()) as {
      reveal: LearningCycleReveal;
      questionOptions: Array<{ id: string; label: string }>;
    };
    setQuestionOptions(payload.questionOptions);
    window.sessionStorage.setItem(optionsKey, JSON.stringify(payload.questionOptions));
    return payload.reveal;
  }

  async function completeQuestions() {
    if (!cycle?.responses.at(-1) || selectedIds.length === 0) return;
    setStatus("saving");
    try {
      const response = await fetch(`/api/drills/${definition.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: selectedIds,
          cycle,
        }),
      });
      if (!response.ok) throw new Error("Unable to complete clarification drill");
      const evaluated = (await response.json()) as NonNullable<typeof result>;
      const practiceSession = repository && userId
        ? { repository, userId }
        : await getBrowserPracticeSession();
      await practiceSession.repository.saveDrillAttempt(
        createV2ClarificationAttempt({
          attemptId: createAttemptId(),
          userId: practiceSession.userId,
          definition,
          cycle,
          systemDiagnostics: evaluated.diagnostics,
          completedAt: now().toISOString(),
        }),
      );
      setResult(evaluated);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className={styles.session}>
      <div className={styles.progress}><span>clarification</span><span>V2 practice</span></div>
      <div className={styles.prompt}>
        <p>Case opening</p>
        <h1>{definition.title}</h1>
        <p>{definition.casePrompt}</p>
      </div>
      <div className={styles.workspace}>
        {!result && (
          <GeneratedResponseCycle
            prompt={definition.responsePrompt}
            storageKey={cycleKey}
            onCommit={commitResponse}
            onComplete={setCycle}
          />
        )}
        {!result && cycle && questionOptions.length > 0 && (
          <fieldset className={styles.form}>
            <legend>Choose the clarification questions you would ask</legend>
            {orderedQuestionOptions.map((option) => (
              <label className={styles.checkbox} key={option.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={() => setSelectedIds((current) =>
                    current.includes(option.id)
                      ? current.filter((id) => id !== option.id)
                      : [...current, option.id]
                  )}
                />
                {option.label}
              </label>
            ))}
            {status === "error" && <p role="alert">Your result was not saved. Try again.</p>}
            <button type="button" disabled={selectedIds.length === 0 || status === "saving"} onClick={() => void completeQuestions()}>
              {status === "saving" ? "Saving opening" : "Ask selected questions"}
            </button>
          </fieldset>
        )}
        {result && (
          <div className={styles.result} aria-live="polite">
            <p>Interviewer responses</p>
            {result.responses.map((item) => <p key={item.questionId}>{item.response}</p>)}
            <h2>Opening diagnostics</h2>
            <ul>{result.diagnostics.map((item) => <li key={item.code}>{item.code.replaceAll("_", " ")} · {item.source}</li>)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}
