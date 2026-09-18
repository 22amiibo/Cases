"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createBrowserSupabaseClient } from "@/data/supabase-repository";
import { changeLearnerIdentity } from "@/data/learner-identity";
import { retryOwnedSaves } from "@/data/owned-saves";

export function LearnerIdentityBoundary({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { if (identity !== null) void retryOwnedSaves(identity); }, [identity]);
  useEffect(() => {
    let active = true;
    const apply = (userId: string, initial = false) => {
      if (!active) return;
      try {
        changeLearnerIdentity(userId);
        if (initial) setIdentity(userId);
        else flushSync(() => setIdentity(userId));
      } catch {
        // Fail closed if browser storage cannot be cleared safely.
        flushSync(() => { setIdentity(null); setError(true); });
      }
    };
    const client = createBrowserSupabaseClient();
    if (!client) {
      queueMicrotask(() => apply("guest", true));
      return () => { active = false; };
    }
    const { data } = client.auth.onAuthStateChange((event, session) => {
      apply(session?.user.id ?? "guest", event === "INITIAL_SESSION");
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  if (error) return <p role="alert">Account state could not be reset. Close this tab before continuing.</p>;
  if (identity === null) return <p role="status">Loading account…</p>;
  return <Fragment key={identity}>{children}</Fragment>;
}
