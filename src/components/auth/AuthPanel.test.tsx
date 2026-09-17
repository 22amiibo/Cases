import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthPanel, type PracticeAuthClient } from "./AuthPanel";

function authClient(): PracticeAuthClient {
  return {
    getUser: vi.fn().mockResolvedValue({ user: null, error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe("AuthPanel", () => {
  it("offers email sign-in while keeping the guest demo available", async () => {
    const client = authClient();
    const user = userEvent.setup();
    render(<AuthPanel client={client} />);

    expect(
      screen.getByRole("link", { name: /continue as guest/i }),
    ).toHaveAttribute("href", "/cases/alpinefit-profitability");

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "learner@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /email me a sign-in link/i }),
    );

    expect(client.signInWithOtp).toHaveBeenCalledWith({
      email: "learner@example.com",
      emailRedirectTo: window.location.origin,
    });
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it("explains guest mode when Supabase is not configured", () => {
    render(<AuthPanel client={null} />);

    expect(screen.getByText(/guest mode is ready/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /continue as guest/i }),
    ).toBeInTheDocument();
  });

  it("checks an authenticated session only once across state updates", async () => {
    const client = authClient();
    vi.mocked(client.getUser).mockResolvedValue({
      user: { id: "user-1", email: "learner@example.com" },
      error: null,
    });
    const clientFactory = vi.fn(() => client);
    render(<AuthPanel clientFactory={clientFactory} />);

    expect(
      await screen.findByText(/signed in as learner@example.com/i),
    ).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(client.getUser).toHaveBeenCalledTimes(1);
    expect(clientFactory).toHaveBeenCalledTimes(1);
  });
});
