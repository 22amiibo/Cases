"use client";

import { useState } from "react";
import type { CalculationDefinition } from "@/core/schema";
import { withinTolerance } from "@/core/validation";
import styles from "./CalculationTask.module.css";

export function CalculationTask({
  definition,
  onSubmit,
}: {
  definition: Pick<CalculationDefinition, "id" | "prompt" | "unit"> &
    Partial<Pick<CalculationDefinition, "expectedAnswer" | "tolerance">>;
  onSubmit: (
    result: { taskId: string; answer: number },
  ) => boolean | void | Promise<boolean | void>;
}) {
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);

  return (
    <form
      className={styles.task}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!answer) return;
        const numericAnswer = Number(answer);
        const serverResult = await onSubmit({
          taskId: definition.id,
          answer: numericAnswer,
        });
        setCorrect(
          typeof serverResult === "boolean"
            ? serverResult
            : definition.expectedAnswer !== undefined &&
                definition.tolerance !== undefined
              ? withinTolerance(
            numericAnswer,
            definition.expectedAnswer,
            definition.tolerance,
                )
              : false,
        );
      }}
    >
      <div className={styles.heading}>
        <span>Calculation · {definition.unit}</span>
        <h2>{definition.prompt}</h2>
      </div>
      <div className={styles.answerRow}>
        <label>
          Answer in {definition.unit}
          <input
            type="number"
            step="any"
            inputMode="decimal"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setCorrect(null);
            }}
          />
        </label>
        <button type="submit" disabled={!answer}>
          Check calculation
        </button>
      </div>
      <label>
        Scratch calculation (not graded)
        <textarea rows={4} placeholder="Set up your equation…" />
      </label>
      {correct !== null && (
        <p className={correct ? styles.correct : styles.incorrect} role="status">
          {correct ? "Correct" : "Check your math"}
        </p>
      )}
    </form>
  );
}
