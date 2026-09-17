import { describe, expect, it } from "vitest";
import { MemoryPracticeRepository } from "./memory-repository";
import {
  resolvePracticeSession,
  type PracticeSessionDependencies,
} from "./browser-practice";

function dependencies(
  user: { id: string } | null,
): PracticeSessionDependencies {
  const guestRepository = new MemoryPracticeRepository();
  const signedInRepository = new MemoryPracticeRepository();
  return {
    guestRepository,
    getAuthenticatedUser: async () => user,
    createSignedInRepository: () => signedInRepository,
  };
}

describe("resolvePracticeSession", () => {
  it("uses browser guest persistence when no user is signed in", async () => {
    const input = dependencies(null);

    await expect(resolvePracticeSession(input)).resolves.toEqual({
      repository: input.guestRepository,
      userId: "guest",
      isSignedIn: false,
    });
  });

  it("uses the signed-in repository for the authenticated user", async () => {
    const input = dependencies({ id: "user-1" });

    const session = await resolvePracticeSession(input);

    expect(session.userId).toBe("user-1");
    expect(session.isSignedIn).toBe(true);
    expect(session.repository).not.toBe(input.guestRepository);
  });

  it("surfaces authentication lookup failures instead of silently using guest storage", async () => {
    const input = dependencies(null);
    input.getAuthenticatedUser = async () => {
      throw new Error("auth unavailable");
    };

    await expect(resolvePracticeSession(input)).rejects.toThrow(
      "auth unavailable",
    );
  });
});
