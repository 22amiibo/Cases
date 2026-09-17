"use client";

import Link from "next/link";
import styles from "./error.module.css";

export default function CasesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.card} role="alert">
        <span>Content validation stopped this page</span>
        <h1>Case content could not be loaded</h1>
        <p>
          A case definition did not pass validation. No partial or untrusted
          case content was shown.
        </p>
        <div>
          <button type="button" onClick={reset}>
            Try again
          </button>
          <Link href="/">Return home</Link>
        </div>
      </section>
    </main>
  );
}
