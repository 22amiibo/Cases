"use client";

import { useEffect, useState } from "react";
import styles from "./Scratchpad.module.css";

export function Scratchpad({ storageKey }: { storageKey: string }) {
  const [notes, setNotes] = useState(
    () => window.sessionStorage.getItem(storageKey) ?? "",
  );

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, notes);
  }, [notes, storageKey]);

  return (
    <section className={styles.panel} aria-labelledby="scratchpad-title">
      <div>
        <span>Private notes</span>
        <h2 id="scratchpad-title">Scratchpad</h2>
      </div>
      <textarea
        aria-label="Scratchpad"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Capture a hypothesis, calculation, or recommendation outline…"
        rows={9}
      />
    </section>
  );
}
