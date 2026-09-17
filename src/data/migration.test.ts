import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/001_initial.sql",
);
const v2MigrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/002_v2_learning_evidence.sql",
);

function migrationSql() {
  return readFileSync(migrationPath, "utf8")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function v2MigrationSql() {
  return readFileSync(v2MigrationPath, "utf8")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

describe("initial Supabase migration", () => {
  it.each(["profiles", "drill_attempts", "case_attempts", "case_events"])(
    "creates %s with row-level security and user-owned policies",
    (table) => {
      const sql = migrationSql();
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(sql).toMatch(
        new RegExp(
          `create policy[\\s\\S]*?on public\\.${table}[\\s\\S]*?auth\\.uid\\(\\)`,
        ),
      );
    },
  );

  it("saves each case attempt and its events atomically for the authenticated user", () => {
    const sql = migrationSql();
    expect(sql).toContain("create or replace function public.save_case_attempt");
    expect(sql).toContain("auth.uid() is distinct from p_user_id");
    expect(sql).toContain("insert into public.case_attempts");
    expect(sql).toContain("insert into public.case_events");
    expect(sql).toContain(
      "foreign key (case_attempt_id, user_id) references public.case_attempts(id, user_id)",
    );
    expect(sql).toContain("on conflict (id) do nothing");
    expect(sql).toContain("on conflict (case_attempt_id, sequence) do nothing");
  });

  it("constrains persisted case scores to the five trainable skills and 0–100", () => {
    const sql = migrationSql();

    expect(sql).toContain("public.is_valid_skill_scores(skill_scores)");
    expect(sql).toContain(
      "'structure', 'prioritization', 'quantitative', 'exhibit', 'synthesis'",
    );
    expect(sql).toContain("score_value < 0 or score_value > 100");
  });
});

describe("V2 learning evidence migration", () => {
  it("is additive and stores versioned evidence on both attempt tables", () => {
    const sql = v2MigrationSql();
    expect(sql).not.toMatch(/drop table|truncate|delete from/);
    for (const table of ["drill_attempts", "case_attempts"]) {
      expect(sql).toContain(`alter table public.${table}`);
    }
    for (const column of [
      "content_version",
      "event_schema_version",
      "scoring_version",
      "scaffolding_level",
      "learning_evidence",
      "diagnostics",
    ]) {
      expect(sql).toContain(`add column if not exists ${column}`);
    }
  });

  it("adds clarification and requires complete metadata only for V2 rows", () => {
    const sql = v2MigrationSql();
    expect(sql).toContain("'clarification', 'structure', 'prioritization'");
    expect(sql).toContain("scoring_version = 'v2'");
    expect(sql).toContain("content_version > 0");
    expect(sql).toContain("event_schema_version > 0");
    expect(sql).toContain("jsonb_typeof(learning_evidence) = 'object'");
  });

  it("keeps retry-safe writes and exposes user-scoped ordered event reads", () => {
    const sql = v2MigrationSql();
    expect(sql).toContain("create or replace function public.save_case_attempt_v2");
    expect(sql).toContain("on conflict (id) do nothing");
    expect(sql).toContain("on conflict (case_attempt_id, sequence) do nothing");
    expect(sql).toContain("create or replace function public.get_case_events");
    expect(sql).toContain("user_id = auth.uid()");
    expect(sql).toContain("order by sequence asc");
  });
});
