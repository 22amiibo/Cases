"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CaseWalkthrough.module.css";

const steps = [
  {
    title: "Build a framework",
    text: "Organize the problem into major areas and supporting points, then choose the area you would investigate first.",
  },
  {
    title: "Investigate and update",
    text: "Choose focused questions, record a testable hypothesis, and update it when the evidence changes your view.",
  },
  {
    title: "Work with evidence",
    text: "Interpret exhibits and complete calculations before you see authored comparisons or corrective feedback.",
  },
  {
    title: "Synthesize and recommend",
    text: "State the answer first, connect decisive evidence, name a risk, and propose a concrete next step.",
  },
  {
    title: "Know what is saved",
    text: "Committed responses become practice evidence. Your scratchpad stays private and ungraded in this browser session.",
  },
] as const;

export function CaseWalkthrough() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const reopenButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const current = steps[step];

  useEffect(() => {
    if (open) dialog.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setStep(0);
    requestAnimationFrame(() => reopenButton.current?.focus());
  }

  return (
    <>
      <button
        ref={reopenButton}
        type="button"
        className={styles.reopen}
        onClick={() => setOpen(true)}
      >
        How this case works
      </button>
      {open && (
        <div
          className={styles.backdrop}
          role="presentation"
          onMouseDown={close}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              close();
              return;
            }
            if (event.key !== "Tab") return;
            const focusable = Array.from(
              dialog.current?.querySelectorAll<HTMLElement>(
                "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
              ) ?? [],
            );
            const first = focusable[0];
            const last = focusable.at(-1);
            if (!first || !last) return;
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <section
            ref={dialog}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-walkthrough-title"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.progress}>
              <span>Case tools</span>
              <span>{step + 1} of {steps.length}</span>
            </div>
            <h2 id="case-walkthrough-title">{current.title}</h2>
            <p>{current.text}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.skip} onClick={close}>
                Skip walkthrough
              </button>
              {step > 0 && (
                <button type="button" onClick={() => setStep((value) => value - 1)}>
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (step === steps.length - 1) close();
                  else setStep((value) => value + 1);
                }}
              >
                {step === steps.length - 1 ? "Done" : "Next"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
