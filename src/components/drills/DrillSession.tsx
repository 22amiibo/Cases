"use client";

import { useState, type FormEvent } from "react";
import type { DrillDefinition, FrameworkSubmission } from "@/core/schema";
import {
  evaluateDrill,
  type DrillResult,
  type ExhibitSubmission,
  type SynthesisSubmission,
} from "@/core/drill-engine";
import { FrameworkBuilder } from "@/components/framework/FrameworkBuilder";
import { ExhibitRenderer } from "@/components/exhibits/ExhibitRenderer";
import { createDrillAttempt } from "@/data/attempts";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { PracticeRepository } from "@/data/repository";
import styles from "./DrillSession.module.css";

type DrillSessionProps = {
  definitions: DrillDefinition[];
  repository?: PracticeRepository;
  userId?: string;
  now?: () => Date;
};

function formatFeedback(code: string) {
  return code.replaceAll("_", " ");
}

export function DrillSession({
  definitions,
  repository,
  userId,
  now = () => new Date(),
}: DrillSessionProps) {
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<DrillResult | null>(null);
  const definition = definitions[index];

  async function complete(submission: Parameters<typeof evaluateDrill>[1]) {
    const nextResult = evaluateDrill(definition, submission);
    const practiceSession =
      repository && userId
        ? { repository, userId }
        : await getBrowserPracticeSession();
    await practiceSession.repository.saveDrillAttempt(
      createDrillAttempt(
        practiceSession.userId,
        definition,
        nextResult,
        now().toISOString(),
      ),
    );
    setResult(nextResult);
  }

  function next() {
    setIndex((current) => (current + 1) % definitions.length);
    setResult(null);
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
        {!result && <DrillInput definition={definition} onComplete={complete} />}
        {result && (
          <div className={styles.result} aria-live="polite">
            <p>Deterministic feedback</p>
            <strong>
              {result.pointsEarned} / {result.pointsPossible}
            </strong>
            <h2>{formatFeedback(result.feedbackCode)}</h2>
            <p>
              Your score comes from the authored rubric for this exact reasoning
              move—not a language model or hidden interpretation.
            </p>
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
      return (
        <FrameworkBuilder
          concepts={definition.conceptOptions.map((option) => ({
            ...option,
            aliases: [],
          }))}
          onSubmit={(submission: FrameworkSubmission) => onComplete(submission)}
        />
      );
    case "prioritization":
      return (
        <ChoiceForm
          label="Best next branch"
          options={definition.options}
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

function ChoiceForm({
  label,
  options,
  onSubmit,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  onSubmit: (id: string) => void;
}) {
  const [value, setValue] = useState("");
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
          {options.map((option) => (
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
        <label>
          Unit
          <select value={unit} onChange={(event) => setUnit(event.target.value)}>
            <option value="">Choose a unit</option>
            {units.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Scratch calculation (not graded)
        <textarea rows={5} placeholder="Write out your math…" />
      </label>
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
        <OptionSelect label="What" options={definition.observationOptions} value={submission.observationId} onChange={(observationId) => setSubmission({ ...submission, observationId })} />
        <OptionSelect label="So what" options={definition.implicationOptions} value={submission.implicationId} onChange={(implicationId) => setSubmission({ ...submission, implicationId })} />
        <OptionSelect label="Now what" options={definition.nextInvestigationOptions} value={submission.nextInvestigationId} onChange={(nextInvestigationId) => setSubmission({ ...submission, nextInvestigationId })} />
        <button type="submit" disabled={Object.values(submission).some((value) => !value)}>Check answer</button>
      </form>
    </div>
  );
}

function OptionSelect({ label, options, value, onChange }: { label: string; options: Array<{id: string; label: string}>; value: string; onChange: (id: string) => void }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose one</option>{options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>;
}

function SynthesisForm({ definition, onComplete }: { definition: Extract<DrillDefinition, { skillId: "synthesis" }>; onComplete: (submission: SynthesisSubmission) => void }) {
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [nextStepId, setNextStepId] = useState("");
  return <form className={styles.form} onSubmit={(event) => { event.preventDefault(); onComplete({ evidenceIds, nextStepId }); }}>
    <fieldset><legend>Choose two decision-relevant facts</legend>{definition.evidenceOptions.map((option) => <label className={styles.checkbox} key={option.id}><input type="checkbox" checked={evidenceIds.includes(option.id)} disabled={!evidenceIds.includes(option.id) && evidenceIds.length >= 2} onChange={(event) => setEvidenceIds((current) => event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} />{option.label}</label>)}</fieldset>
    <OptionSelect label="Best next step" options={definition.nextStepOptions} value={nextStepId} onChange={setNextStepId} />
    <button type="submit" disabled={evidenceIds.length !== 2 || !nextStepId}>Check answer</button>
  </form>;
}
