"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "./Scratchpad.module.css";

export function Scratchpad({ storageKey }: { storageKey: string }) {
  const [notes, setNotes] = useState(
    () => window.sessionStorage.getItem(storageKey) ?? "",
  );
  const textarea = useRef<HTMLTextAreaElement>(null);
  const releaseTab = useRef(false);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, notes);
  }, [notes, storageKey]);

  function replaceSelection(start: number, end: number, replacement: string) {
    setNotes((current) => `${current.slice(0, start)}${replacement}${current.slice(end)}`);
    queueMicrotask(() => {
      const position = start + replacement.length;
      textarea.current?.setSelectionRange(position, position);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const start = event.currentTarget.selectionStart;
    const end = event.currentTarget.selectionEnd;
    if (event.key === "Escape") {
      releaseTab.current = true;
      return;
    }
    if (event.key === "Tab" && releaseTab.current) {
      releaseTab.current = false;
      return;
    }
    if (event.key === "Enter") {
      const lineStart = notes.lastIndexOf("\n", start - 1) + 1;
      const currentLine = notes.slice(lineStart, start);
      const bullet = currentLine.match(/^(\s*)-\s+/);
      if (!bullet) return;
      event.preventDefault();
      replaceSelection(start, end, `\n${bullet[1]}- `);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const lineStart = notes.lastIndexOf("\n", start - 1) + 1;
      if (event.shiftKey) {
        const removable = notes.slice(lineStart, lineStart + 2) === "  ";
        if (!removable) return;
        setNotes((current) => `${current.slice(0, lineStart)}${current.slice(lineStart + 2)}`);
        queueMicrotask(() => textarea.current?.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2)));
      } else {
        setNotes((current) => `${current.slice(0, lineStart)}  ${current.slice(lineStart)}`);
        queueMicrotask(() => textarea.current?.setSelectionRange(start + 2, end + 2));
      }
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="scratchpad-title">
      <div>
        <span>Private notes</span>
        <h2 id="scratchpad-title">Scratchpad</h2>
      </div>
      <textarea
        ref={textarea}
        aria-label="Scratchpad"
        aria-describedby="scratchpad-help"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Capture a hypothesis, calculation, or recommendation outline…"
        rows={9}
      />
      <p id="scratchpad-help" className={styles.help}>
        Private and ungraded. Enter continues bullets; Tab indents. Press Escape,
        then Tab to move focus.
      </p>
    </section>
  );
}
