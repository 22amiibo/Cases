import type { PracticeRepository } from "./repository";
import { learnerIdentity } from "./learner-identity";
import { getGuestPracticeRepository } from "./memory-repository";
import {
  createBrowserSupabaseClient,
  createSupabasePracticeRepository,
} from "./supabase-repository";

export type PracticeSessionDependencies = {
  guestRepository: PracticeRepository;
  getAuthenticatedUser: () => Promise<{ id: string } | null>;
  createSignedInRepository: () => PracticeRepository;
};

export async function resolvePracticeSession({
  guestRepository,
  getAuthenticatedUser,
  createSignedInRepository,
}: PracticeSessionDependencies) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      repository: guestRepository,
      userId: "guest",
      isSignedIn: false as const,
    };
  }

  return {
    repository: createSignedInRepository(),
    userId: user.id,
    isSignedIn: true as const,
  };
}

export async function getBrowserPracticeSession(expectedUserId = learnerIdentity()) {
  const supabase = createBrowserSupabaseClient();
  const session = await resolvePracticeSession({
    guestRepository: getGuestPracticeRepository(),
    getAuthenticatedUser: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session?.user ?? null;
    },
    createSignedInRepository: () => {
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }
      return createSupabasePracticeRepository(supabase);
    },
  });
  if (session.userId !== expectedUserId) throw new Error("Account changed; save remains with its original owner");
  return session;
}
