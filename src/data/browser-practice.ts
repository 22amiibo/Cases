import type { PracticeRepository } from "./repository";
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

export async function getBrowserPracticeSession() {
  const supabase = createBrowserSupabaseClient();
  return resolvePracticeSession({
    guestRepository: getGuestPracticeRepository(),
    getAuthenticatedUser: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase.auth.getUser();
      return error ? null : data.user;
    },
    createSignedInRepository: () => {
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }
      return createSupabasePracticeRepository(supabase);
    },
  });
}
