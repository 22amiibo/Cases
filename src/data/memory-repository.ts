import { z } from "zod";
import { CaseEventSchema, SkillIdSchema } from "@/core/schema";
import type {
  CaseAttempt,
  DrillAttempt,
  PracticeRepository,
  SkillAttempt,
} from "./repository";

const STORAGE_KEY = "casework:practice-history";

const DrillAttemptSchema = z.object({
  userId: z.string().min(1),
  drillId: z.string().min(1),
  skillId: SkillIdSchema,
  score: z.number().finite(),
  feedbackCodes: z.array(z.string()),
  conceptIdsPracticed: z.array(z.string()),
  completedAt: z.iso.datetime(),
});

const CaseAttemptSchema = z.object({
  userId: z.string().min(1),
  caseId: z.string().min(1),
  completedAt: z.iso.datetime(),
  skillScores: z.partialRecord(SkillIdSchema, z.number().finite()),
  feedbackCodes: z.array(z.string()),
  events: z.array(CaseEventSchema),
});

const StoredHistorySchema = z.object({
  drillAttempts: z.array(DrillAttemptSchema),
  caseAttempts: z.array(CaseAttemptSchema),
});

type StoredHistory = z.infer<typeof StoredHistorySchema>;
type SessionStorage = Pick<Storage, "getItem" | "setItem">;

type MemoryPracticeRepositoryOptions = {
  storage?: SessionStorage;
  storageKey?: string;
};

function emptyHistory(): StoredHistory {
  return { drillAttempts: [], caseAttempts: [] };
}

function loadHistory(
  storage: SessionStorage | undefined,
  storageKey: string,
): StoredHistory {
  if (!storage) return emptyHistory();

  const serialized = storage.getItem(storageKey);
  if (!serialized) return emptyHistory();

  try {
    const parsed = StoredHistorySchema.safeParse(JSON.parse(serialized));
    return parsed.success ? parsed.data : emptyHistory();
  } catch {
    return emptyHistory();
  }
}

function toCaseSkillHistory(attempt: CaseAttempt): SkillAttempt[] {
  return Object.entries(attempt.skillScores).map(([skillId, score]) => ({
    userId: attempt.userId,
    skillId: SkillIdSchema.parse(skillId),
    score,
    feedbackCodes: attempt.feedbackCodes,
    completedAt: attempt.completedAt,
  }));
}

export class MemoryPracticeRepository implements PracticeRepository {
  private history: StoredHistory;
  private readonly storage?: SessionStorage;
  private readonly storageKey: string;

  constructor(options: MemoryPracticeRepositoryOptions = {}) {
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? STORAGE_KEY;
    this.history = loadHistory(this.storage, this.storageKey);
  }

  async saveDrillAttempt(attempt: DrillAttempt): Promise<void> {
    this.history.drillAttempts.push(DrillAttemptSchema.parse(attempt));
    this.persist();
  }

  async saveCaseAttempt(attempt: CaseAttempt): Promise<void> {
    this.history.caseAttempts.push(CaseAttemptSchema.parse(attempt));
    this.persist();
  }

  async getSkillHistory(userId: string): Promise<SkillAttempt[]> {
    return [
      ...this.history.drillAttempts
        .filter((attempt) => attempt.userId === userId)
        .map((attempt) => ({
          userId: attempt.userId,
          skillId: attempt.skillId,
          score: attempt.score,
          feedbackCodes: attempt.feedbackCodes,
          completedAt: attempt.completedAt,
        })),
      ...this.history.caseAttempts
        .filter((attempt) => attempt.userId === userId)
        .flatMap(toCaseSkillHistory),
    ].sort(
      (left, right) =>
        new Date(right.completedAt).getTime() -
        new Date(left.completedAt).getTime(),
    );
  }

  private persist() {
    this.storage?.setItem(this.storageKey, JSON.stringify(this.history));
  }
}

let guestRepository: MemoryPracticeRepository | undefined;

export function getGuestPracticeRepository() {
  if (!guestRepository) {
    guestRepository = new MemoryPracticeRepository({
      storage:
        typeof window === "undefined" ? undefined : window.sessionStorage,
    });
  }
  return guestRepository;
}
