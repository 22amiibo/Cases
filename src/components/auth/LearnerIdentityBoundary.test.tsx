import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { Scratchpad } from "@/components/investigation/Scratchpad";
import { LearnerIdentityBoundary } from "./LearnerIdentityBoundary";

const auth = vi.hoisted(() => ({ notify: (() => {}) as (event: string, session: { user: { id: string } } | null) => void }));
vi.mock("@/data/supabase-repository", () => ({
  createBrowserSupabaseClient: () => ({ auth: { onAuthStateChange: (callback: typeof auth.notify) => {
    auth.notify = callback;
    return { data: { subscription: { unsubscribe() {} } } };
  } } }),
}));
beforeEach(() => sessionStorage.clear());

it("discards mounted drafts on A/logout/B/logout/A and identity replacement, including refresh", async () => {
  const user = userEvent.setup();
  const view = () => <LearnerIdentityBoundary><Scratchpad storageKey="casework:guest-session:case:scratchpad" /></LearnerIdentityBoundary>;
  let mounted = render(view());
  expect(screen.queryByRole("textbox")).toBeNull();
  act(() => auth.notify("INITIAL_SESSION", { user: { id: "A" } }));
  await user.type(screen.getByRole("textbox"), "A private draft");
  for (const id of [null, "B", null, "A", "B"]) {
    act(() => auth.notify(id ? "SIGNED_IN" : "SIGNED_OUT", id ? { user: { id } } : null));
    expect(screen.getByRole("textbox")).toHaveValue("");
    await user.type(screen.getByRole("textbox"), `${id ?? "guest"} draft`);
  }
  // Refresh after switching identity must not restore A's discarded draft.
  mounted.unmount();
  mounted = render(view());
  act(() => auth.notify("INITIAL_SESSION", { user: { id: "B" } }));
  expect(screen.getByRole("textbox")).toHaveValue("B draft");
  act(() => auth.notify("TOKEN_REFRESHED", { user: { id: "A" } }));
  expect(screen.getByRole("textbox")).toHaveValue("");
  mounted.unmount();
});
