"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/data/supabase-repository";
import styles from "./AuthPanel.module.css";

export type PracticeAuthClient = {
  getUser(): Promise<{
    user: { id: string; email?: string } | null;
    error: Error | null;
  }>;
  signInWithOtp(input: {
    email: string;
    emailRedirectTo: string;
  }): Promise<{ error: Error | null }>;
  signOut(): Promise<{ error: Error | null }>;
};

function browserAuthClient(): PracticeAuthClient | null {
  const client = createBrowserSupabaseClient();
  if (!client) return null;

  return {
    async getUser() {
      const { data, error } = await client.auth.getUser();
      return { user: data.user, error };
    },
    async signInWithOtp({ email, emailRedirectTo }) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });
      return { error };
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      return { error };
    },
  };
}

export function AuthPanel({
  client,
  clientFactory = browserAuthClient,
}: {
  client?: PracticeAuthClient | null;
  clientFactory?: () => PracticeAuthClient | null;
}) {
  const [resolvedClient] = useState(() =>
    client === undefined ? clientFactory() : client,
  );
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  useEffect(() => {
    let active = true;
    if (resolvedClient) {
      void resolvedClient.getUser().then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      });
    }
    return () => {
      active = false;
    };
  }, [resolvedClient]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!resolvedClient || !email) return;
    setStatus("sending");
    const { error } = await resolvedClient.signInWithOtp({
      email,
      emailRedirectTo: window.location.origin,
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <aside className={styles.panel} aria-label="Account and guest access">
      <div>
        <span className={styles.eyebrow}>Save your progress</span>
        {user ? (
          <>
            <h2>Signed in{user.email ? ` as ${user.email}` : ""}</h2>
            <button
              type="button"
              onClick={async () => {
                if (!resolvedClient) return;
                const { error } = await resolvedClient.signOut();
                if (!error) setUser(null);
              }}
            >
              Sign out
            </button>
          </>
        ) : resolvedClient ? (
          <>
            <h2>Keep your practice history</h2>
            <form onSubmit={submit}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={status === "sending"}>
                {status === "sending"
                  ? "Sending…"
                  : "Email me a sign-in link"}
              </button>
            </form>
            {status === "sent" && (
              <p role="status">Check your email for the secure sign-in link.</p>
            )}
            {status === "error" && (
              <p role="alert">The link could not be sent. Try again.</p>
            )}
          </>
        ) : (
          <>
            <h2>Guest mode is ready</h2>
            <p>Add Supabase environment variables to enable account sign-in.</p>
          </>
        )}
      </div>
      <Link href="/cases/alpinefit-profitability">Continue as guest →</Link>
    </aside>
  );
}
