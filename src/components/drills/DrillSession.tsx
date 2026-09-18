"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import type { DrillDefinition, FrameworkSubmission } from "@/core/schema";
import {
  evaluateDrill,
  type DrillResult,
  type ExhibitSubmission,
  type SynthesisSubmission,
} from "@/core/drill-engine";
import { FrameworkBuilder } from "@/components/framework/FrameworkBuilder";
import { ChoiceListbox } from "@/components/forms/ChoiceListbox";
import { useStableChoiceOrder } from "@/components/forms/useStableChoiceOrder";
import { ExhibitRenderer } from "@/components/exhibits/ExhibitRenderer";
import { QuantitativeFeedbackPanel } from "@/components/practice/QuantitativeFeedbackPanel";
import { createDrillAttempt } from "@/data/attempts";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { PracticeRepository } from "@/data/repository";
import {
  clearPendingAttempt,
  loadPendingAttempt,
  savePendingAttempt,
} from "@/data/pending-attempts";
import styles from "./DrillSession.module.css";

type DrillSessionProps = {
  definitions: DrillDefinition[];
  repository?: PracticeRepository;
  userId?: string;
  now?: () => Date;
  createAttemptId?: () => string;
};

type PendingDrillSave = {
  attemptId: string;
  completedAt: string;
  definitionId: string;
  result: DrillResult;
};

function pendingDrillKey(definitionId: string) {
  return `drill:${definitionId}`;
}

function feedbackMessage(code: string) {
  const messages: Record<string, string> = {
    strong_priority: "Your selected branch has the highest authored information value.",
    check_priority: "Compare which branch would eliminate the most uncertainty first.",
    correct_calculation: "Your numeric answer and unit both match the authored result.",
    check_answer_and_unit: "Review both the numeric setup and the requested unit before trying again.",
    strong_exhibit_chain: "Your observation, implication, and next investigation form a supported chain.",
    check_exhibit_chain: "Separate what the exhibit shows from what it implies and what you would test next.",
    strong_synthesis: "You selected decisive evidence and a useful next step.",
    check_synthesis: "Use the strongest decision-relevant evidence and close with the next unresolved test.",
  };
  return messages[code] ?? "Review the highlighted reasoning move before the next repetition.";
}

export function DrillSession({
  ...props
}: DrillSessionProps) {
  const clientReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!clientReady) return null;
  return <HydratedDrillSession {...props} />;
}

function HydratedDrillSession({
  definitions,
  repository,
  userId,
  now = () => new Date(),
  createAttemptId = () => crypto.randomUUID(),
}: DrillSessionProps) {
  const [restoredSave] = useState(() => {
    for (const [definitionIndex, candidate] of definitions.entries()) {
      const pending = loadPendingAttempt<PendingDrillSave>(
        window.sessionStorage,
        pendingDrillKey(candidate.id),
      );
      if (pending?.definitionId === candidate.id) {
        return { definitionIndex, pending };
      }
    }
    return null;
  });
  const [index, setIndex] = useState(restoredSave?.definitionIndex ?? 0);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingDrillSave | null>(
    restoredSave?.pending ?? null,
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">(
    restoredSave ? "error" : "idle",
  );
  const definition = definitions[index];

  async function complete(submission: Parameters<typeof evaluateDrill>[1]) {
    if (saveStatus !== "idle") return;
    const nextSave = {
      attemptId: createAttemptId(),
      completedAt: now().toISOString(),
      definitionId: definition.id,
      result: evaluateDrill(definition, submission),
    };
    try {
      savePendingAttempt(
        window.sessionStorage,
        pendingDrillKey(definition.id),
        nextSave,
      );
      setPendingSave(nextSave);
      await persist(nextSave);
    } catch {
      setPendingSave(nextSave);
      setSaveStatus("error");
    }
  }

  async function persist(save: PendingDrillSave) {
    setSaveStatus("saving");
    try {
      const savedDefinition = definitions.find(
        (candidate) => candidate.id === save.definitionId,
      );
      if (!savedDefinition) throw new Error("Drill definition is unavailable");
      const practiceSession =
        repository && userId
          ? { repository, userId }
          : await getBrowserPracticeSession();
      await practiceSession.repository.saveDrillAttempt(
        createDrillAttempt(
          save.attemptId,
          practiceSession.userId,
          savedDefinition,
          save.result,
          save.completedAt,
        ),
      );
      clearPendingAttempt(
        window.sessionStorage,
        pendingDrillKey(save.definitionId),
      );
      setResult(save.result);
      setPendingSave(null);
      setSaveStatus("idle");
    } catch {
      setSaveStatus("error");
    }
  }

  function next() {
    if (pendingSave) {
      clearPendingAttempt(
        window.sessionStorage,
        pendingDrillKey(pendingSave.definitionId),
      );
    }
    setIndex((current) => (current + 1) % definitions.length);
    setResult(null);
    setPendingSave(null);
    setSaveStatus("idle");
  }

  return (
    <section className={styles.session}>
      <div className={styles.progress}>
        <span>{definition.skillId}</span>
        <span>
          {String(index + 1).padStart(2, "0")} / {definitions.length}
        </span>
      </div>
      <div className={styles.prompt}>
        <p>Think first. Then commit.</p>
        <h1>{definition.prompt}</h1>
      </div>

      <div className={styles.workspace}>
        {!result && saveStatus === "idle" && (
          <DrillInput definition={definition} onComplete={complete} />
        )}
        {!result && saveStatus === "saving" && (
          <p role="status">Saving your practice result…</p>
        )}
        {!result && saveStatus === "error" && pendingSave && (
          <div>
            <p role="alert">Your practice result was not saved.</p>
            <button type="button" onClick={() => void persist(pendingSave)}>
              Try saving again
            </button>
          </div>
        )}
        {result && (
          <div className={styles.result} aria-live="polite">
            <p>Deterministic feedback</p>
            <strong>
              {result.pointsEarned} / {result.pointsPossible}
            </strong>
            <h2>{result.pointsEarned === result.pointsPossible ? "Strong work" : "Keep practicing"}</h2>
            {result.quantitativeFeedback
              ? <QuantitativeFeedbackPanel feedback={result.quantitativeFeedback} />
              : <p>{feedbackMessage(result.feedbackCode)}</p>}
            <button type="button" onClick={next}>
              Next question
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function DrillInput({
  definition,
  onComplete,
}: {
  definition: DrillDefinition;
  onComplete: (submission: Parameters<typeof evaluateDrill>[1]) => void;
}) {
  switch (definition.skillId) {
    case "structure":
      return <StructureForm definition={definition} onComplete={onComplete} />;
    case "prioritization":
      return (
        <ChoiceForm
          label="Best next branch"
          options={definition.options}
          orderKey={definition.id}
          onSubmit={(optionId) => onComplete({ optionId })}
        />
      );
    case "quantitative":
      return <QuantitativeForm definition={definition} onComplete={onComplete} />;
    case "exhibit":
      return <ExhibitForm definition={definition} onComplete={onComplete} />;
    case "synthesis":
      return <SynthesisForm definition={definition} onComplete={onComplete} />;
  }
}

function StructureForm({
  definition,
  onComplete,
}: {
  definition: Extract<DrillDefinition, { skillId: "structure" }>;
  onComplete: (submission: Parameters<typeof evaluateDrill>[1]) => void;
}) {
  const options = useStableChoiceOrder(
    definition.conceptOptions,
    `casework:choice-seed:legacy-drill:${definition.id}`,
    "framework-concepts",
  );
  return (
    <FrameworkBuilder
      concepts={options.map((option) => ({ ...option, aliases: [] }))}
      onSubmit={(submission: FrameworkSubmission) => onComplete(submission)}
    />
  );
}

function ChoiceForm({
  label,
  options,
  orderKey,
  onSubmit,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  orderKey: string;
  onSubmit: (id: string) => void;
}) {
  const [value, setValue] = useState("");
  const orderedOptions = useStableChoiceOrder(
    options,
    `casework:choice-seed:legacy-drill:${orderKey}`,
    label,
  );
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (value) onSubmit(value);
      }}
    >
      <label>
        {label}
        <select value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="">Choose one</option>
          {orderedOptions.map((option) => (
            <option value={option.id} key={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!value}>
        Check answer
      </button>
    </form>
  );
}

function QuantitativeForm({
  definition,
  onComplete,
}: {
  definition: Extract<DrillDefinition, { skillId: "quantitative" }>;
  onComplete: (submission: Parameters<typeof evaluateDrill>[1]) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [unit, setUnit] = useState("");
  const units = [...new Set([definition.requiredUnit, "%", "$m", "units"] )];
  const orderedUnits = useStableChoiceOrder(
    units.map((value) => ({ id: value, label: value })),
    `casework:choice-seed:legacy-drill:${definition.id}`,
    "units",
  );

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (answer && unit) onComplete({ answer: Number(answer), unit });
      }}
    >
      <div className={styles.answerRow}>
        <label>
          Your answer
          <input
            type="number"
            step="any"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </label>
        <ChoiceListbox
          label="Unit"
          value={unit}
          placeholder="Choose a unit"
          options={orderedUnits}
          onChange={setUnit}
        />
      </div>
      <button type="submit" disabled={!answer || !unit}>
        Check answer
      </button>
    </form>
  );
}

function ExhibitForm({
  definition,
  onComplete,
}: {
  definition: Extract<DrillDefinition, { skillId: "exhibit" }>;
  onComplete: (submission: ExhibitSubmission) => void;
}) {
  const [submission, setSubmission] = useState<ExhibitSubmission>({
    observationId: "",
    implicationId: "",
    nextInvestigationId: "",
  });

  return (
    <div className={styles.exhibitLayout}>
      <ExhibitRenderer definition={definition.exhibit} revealed />
      <form
        className={styles.form}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onComplete(submission);
        }}
      >
        <OptionSelect label="What" options={definition.observationOptions} value={submission.observationId} orderKey={definition.id} onChange={(observationId) => setSubmission({ ...submission, observationId })} />
        <OptionSelect label="So what" options={definition.implicationOptions} value={submission.implicationId} orderKey={definition.id} onChange={(implicationId) => setSubmission({ ...submission, implicationId })} />
        <OptionSelect label="Now what" options={definition.nextInvestigationOptions} value={submission.nextInvestigationId} orderKey={definition.id} onChange={(nextInvestigationId) => setSubmission({ ...submission, nextInvestigationId })} />
        <button type="submit" disabled={Object.values(submission).some((value) => !value)}>Check answer</button>
      </form>
    </div>
  );
}

function OptionSelect({ label, options, value, orderKey, onChange }: { label: string; options: Array<{id: string; label: string}>; value: string; orderKey: string; onChange: (id: string) => void }) {
  const orderedOptions = useStableChoiceOrder(
    options,
    `casework:choice-seed:legacy-drill:${orderKey}`,
    label,
  );
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose one</option>{orderedOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>;
}

function SynthesisForm({ definition, onComplete }: { definition: Extract<DrillDefinition, { skillId: "synthesis" }>; onComplete: (submission: SynthesisSubmission) => void }) {
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [nextStepId, setNextStepId] = useState("");
  const orderedEvidence = useStableChoiceOrder(definition.evidenceOptions, `casework:choice-seed:legacy-drill:${definition.id}`, "evidence");
  return <form className={styles.form} onSubmit={(event) => { event.preventDefault(); onComplete({ evidenceIds, nextStepId }); }}>
    <fieldset><legend>Choose two decision-relevant facts</legend>{orderedEvidence.map((option) => <label className={styles.checkbox} key={option.id}><input type="checkbox" checked={evidenceIds.includes(option.id)} disabled={!evidenceIds.includes(option.id) && evidenceIds.length >= 2} onChange={(event) => setEvidenceIds((current) => event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} />{option.label}</label>)}</fieldset>
    <OptionSelect label="Best next step" options={definition.nextStepOptions} value={nextStepId} orderKey={definition.id} onChange={setNextStepId} />
    <button type="submit" disabled={evidenceIds.length !== 2 || !nextStepId}>Check answer</button>
  </form>;
}
