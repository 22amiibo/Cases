"use client";

import { useState, useSyncExternalStore } from "react";
import type { ComponentProps } from "react";
import { FrameworkBuilder } from "@/components/framework/FrameworkBuilder";
import { ChoiceListbox } from "@/components/forms/ChoiceListbox";
import { useStableChoiceOrder } from "@/components/forms/useStableChoiceOrder";
import { GeneratedResponseCycle } from "@/components/practice/GeneratedResponseCycle";
import { QuantitativeFeedbackPanel } from "@/components/practice/QuantitativeFeedbackPanel";
import {
  restoreLearningCycleState,
  type LearningCycleReveal,
  type LearningCycleState,
} from "@/core/learning-cycle";
import type { DiagnosticOutcome, FrameworkSubmission } from "@/core/schema";
import type { projectV2PracticeDrill, LearnerV2Checkpoint, QuantitativeFeedback, V2CheckpointSubmission } from "@/core/v2-drill";
import { createV2DrillAttempt } from "@/data/attempts";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { PracticeRepository } from "@/data/repository";
import styles from "./DrillSession.module.css";

type LearnerDefinition = ReturnType<typeof projectV2PracticeDrill>;

function restoreCheckpoint(serialized: string | null): LearnerV2Checkpoint | null {
  if (!serialized) return null;
  try {
    const value = JSON.parse(serialized) as LearnerV2Checkpoint;
    return ["framework", "choice", "quantitative", "synthesis"].includes(value.kind)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function V2PracticeDrillSession(props: {
  definition: LearnerDefinition;
  repository?: PracticeRepository;
  userId?: string;
  createAttemptId?: () => string;
  now?: () => Date;
}) {
  const ready = useSyncExternalStore(() => () => undefined, () => true, () => false);
  if (!ready) return null;
  return <HydratedV2PracticeDrillSession {...props} />;
}

function HydratedV2PracticeDrillSession({
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
  const cycleKey = `casework:v2-drill:${definition.id}:cycle`;
  const checkpointKey = `casework:v2-drill:${definition.id}:checkpoint`;
  const [cycle, setCycle] = useState<LearningCycleState | null>(() => {
    const restored = restoreLearningCycleState(
      window.sessionStorage.getItem(cycleKey),
      definition.responsePrompt.interactionId,
    );
    return restored?.phase === "complete" ? restored : null;
  });
  const [checkpoint, setCheckpoint] = useState<LearnerV2Checkpoint | null>(() =>
    restoreCheckpoint(window.sessionStorage.getItem(checkpointKey)),
  );
  const [optionId, setOptionId] = useState("");
  const [answer, setAnswer] = useState("");
  const [unit, setUnit] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [nextStepId, setNextStepId] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticOutcome[] | null>(null);
  const [quantitativeFeedback, setQuantitativeFeedback] = useState<QuantitativeFeedback | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const orderSeedKey = `casework:choice-seed:v2-drill:${definition.id}`;
  const orderedCheckpointOptions = useStableChoiceOrder(
    checkpoint?.kind === "choice" ? checkpoint.options : [],
    orderSeedKey,
    "checkpoint",
  );
  const orderedFrameworkConcepts = useStableChoiceOrder(
    checkpoint?.kind === "framework" ? checkpoint.conceptOptions : [],
    orderSeedKey,
    "framework-concepts",
  );
  const orderedEvidenceOptions = useStableChoiceOrder(
    checkpoint?.kind === "synthesis" ? checkpoint.evidenceOptions : [],
    orderSeedKey,
    "evidence",
  );
  const orderedNextStepOptions = useStableChoiceOrder(
    checkpoint?.kind === "synthesis" ? checkpoint.nextStepOptions : [],
    orderSeedKey,
    "next-step",
  );
  const orderedUnitOptions = useStableChoiceOrder(
    checkpoint?.kind === "quantitative"
      ? checkpoint.unitOptions.map((value) => ({ id: value, label: value }))
      : [],
    orderSeedKey,
    "unit",
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
      checkpoint: LearnerV2Checkpoint;
    };
    setCheckpoint(payload.checkpoint);
    window.sessionStorage.setItem(checkpointKey, JSON.stringify(payload.checkpoint));
    return payload.reveal;
  }

  async function completeCheckpoint(submission: V2CheckpointSubmission) {
    const responseId = cycle?.responses.at(-1)?.responseId;
    if (!responseId || status === "saving") return;
    setStatus("saving");
    try {
      const response = await fetch(`/api/drills/${definition.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle, submission }),
      });
      if (!response.ok) throw new Error("Unable to complete checkpoint");
      const evaluated = (await response.json()) as {
        diagnostics: DiagnosticOutcome[];
        feedback?: QuantitativeFeedback;
      };
      const practiceSession = repository && userId
        ? { repository, userId }
        : await getBrowserPracticeSession();
      await practiceSession.repository.saveDrillAttempt(createV2DrillAttempt({
        attemptId: createAttemptId(),
        userId: practiceSession.userId,
        definition,
        cycle,
        systemDiagnostics: evaluated.diagnostics,
        completedAt: now().toISOString(),
      }));
      setDiagnostics(evaluated.diagnostics);
      setQuantitativeFeedback(evaluated.feedback ?? null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function toggleEvidence(id: string) {
    setEvidenceIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  return (
    <section className={styles.session}>
      <div className={styles.progress}><span>{definition.skillId}</span><span>V2 practice</span></div>
      <div className={styles.prompt}>
        <p>Focused practice</p>
        <div><h1>{definition.title}</h1><p>{definition.scenario}</p></div>
      </div>
      <div className={styles.workspace}>
        {!diagnostics && (
          <GeneratedResponseCycle
            prompt={definition.responsePrompt}
            storageKey={cycleKey}
            onCommit={commitResponse}
            onComplete={setCycle}
          />
        )}

        {!diagnostics && cycle && checkpoint?.kind === "framework" && (
          <div className={styles.form}>
            <h2>Build your final issue tree</h2>
            <FrameworkBuilder
              concepts={orderedFrameworkConcepts.map((concept) => ({ ...concept, aliases: [] }))}
              requireRationale
              onSubmit={(submission: FrameworkSubmission) => void completeCheckpoint(submission)}
            />
          </div>
        )}

        {!diagnostics && cycle && checkpoint?.kind === "choice" && (
          <fieldset className={styles.form}>
            <legend>{checkpoint.label}</legend>
            {orderedCheckpointOptions.map((option) => (
              <label className={styles.checkbox} key={option.id}>
                <input type="radio" name="checkpoint-option" value={option.id} checked={optionId === option.id} onChange={() => setOptionId(option.id)} />
                {option.label}
              </label>
            ))}
            <button type="button" disabled={!optionId || status === "saving"} onClick={() => void completeCheckpoint({ optionId })}>Check decision</button>
          </fieldset>
        )}

        {!diagnostics && cycle && checkpoint?.kind === "quantitative" && (
          <div className={styles.form}>
            <h2>Submit your numeric result</h2>
            <div className={styles.answerRow}>
              <label>Answer<input inputMode="decimal" type="number" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>
              <ChoiceListbox
                label="Unit"
                value={unit}
                placeholder="Choose a unit"
                options={orderedUnitOptions}
                onChange={setUnit}
              />
            </div>
            <button type="button" disabled={!answer || !unit.trim() || status === "saving"} onClick={() => void completeCheckpoint({ answer: Number(answer), unit: unit.trim() })}>Check calculation</button>
          </div>
        )}

        {!diagnostics && cycle && checkpoint?.kind === "synthesis" && (
          <div className={styles.form}>
            <fieldset>
              <legend>Select the decisive evidence</legend>
              {orderedEvidenceOptions.map((option) => (
                <label className={styles.checkbox} key={option.id}>
                  <input type="checkbox" checked={evidenceIds.includes(option.id)} onChange={() => toggleEvidence(option.id)} />
                  {option.label}
                </label>
              ))}
            </fieldset>
            <label>Highest-value next step<select value={nextStepId} onChange={(event) => setNextStepId(event.target.value)}><option value="">Choose a next step</option>{orderedNextStepOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
            <button type="button" disabled={evidenceIds.length === 0 || !nextStepId || status === "saving"} onClick={() => void completeCheckpoint({ evidenceIds, nextStepId })}>Check synthesis</button>
          </div>
        )}

        {status === "error" && <p role="alert">Your result was not saved. Try again.</p>}
        {diagnostics && (
          <div className={styles.result} aria-live="polite">
            <p>System diagnostic</p>
            <h2>Practice complete</h2>
            <ul>{diagnostics.map((item) => <li key={item.code}>{item.code.replaceAll("_", " ")} · {item.source}</li>)}</ul>
            {quantitativeFeedback && <QuantitativeFeedbackPanel feedback={quantitativeFeedback} />}
          </div>
        )}
      </div>
    </section>
  );
}
