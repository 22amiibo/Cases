import Link from "next/link";
import styles from "../error.module.css";

export default function CaseNotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span>Unknown case</span>
        <h1>Case not found</h1>
        <p>
          This case ID is not part of the validated six-case library. Choose an
          available case to start a complete session.
        </p>
        <div>
          <Link href="/cases">Browse available cases</Link>
          <Link href="/">Return home</Link>
        </div>
      </section>
    </main>
  );
}
