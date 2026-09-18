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
const caseEventEvidenceMigrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/003_case_event_evidence.sql",
);
const v3MigrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/004_v3_learning.sql",
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

function caseEventEvidenceMigrationSql() {
  return readFileSync(caseEventEvidenceMigrationPath, "utf8")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function v3MigrationSql() {
  return readFileSync(v3MigrationPath, "utf8")
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

describe("V2 case event evidence migration", () => {
  it("keeps V2 case evidence in ordered events without weakening drill evidence", () => {
    const sql = caseEventEvidenceMigrationSql();

    expect(sql).not.toMatch(/drop table|truncate|delete from/);
    expect(sql).toContain("alter table public.case_attempts");
    expect(sql).toContain("learning_evidence is null or jsonb_typeof(learning_evidence) = 'object'");
    expect(sql).toContain("jsonb_typeof(diagnostics) = 'array'");
    expect(sql).not.toContain("alter table public.drill_attempts");
  });
});

describe("V3 learning migration", () => {
  it("is additive and creates owned activity and course evidence", () => {
    const sql = v3MigrationSql();
    expect(sql).not.toMatch(/drop table|truncate|delete from/);
    for (const table of [
      "activity_attempts",
      "activity_events",
      "course_enrollments",
      "course_step_events",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toMatch(new RegExp(`on public\\.${table} .*auth\\.uid\\(\\)`));
    }
    expect(sql).toContain(
      "foreign key (activity_attempt_id, user_id) references public.activity_attempts(id, user_id)",
    );
    expect(sql).toContain("unique (activity_attempt_id, sequence)");
    expect(sql).toContain("unique (activity_attempt_id, event_id)");
  });

  it("requires all-or-none course context and preserves explicit V1/V2/V3 case rows", () => {
    const sql = v3MigrationSql();
    expect(sql).toContain("num_nonnulls(course_id, course_version, course_step_id) in (0, 3)");
    expect(sql).toContain("drop constraint if exists case_attempts_v2_metadata_check");
    expect(sql).toContain("scoring_version = 'v1'");
    expect(sql).toContain("scoring_version = 'v2'");
    expect(sql).toContain("scoring_version = 'v3'");
    expect(sql).toContain("case_mode in ('practice', 'interview')");
  });

  it("saves activity and V3 case events atomically with strict retry checks", () => {
    const sql = v3MigrationSql();
    for (const fn of ["save_activity_attempt_v3", "save_case_attempt_v3"]) {
      expect(sql).toContain(`create or replace function public.${fn}`);
    }
    expect(sql).toContain("auth.uid() is distinct from p_user_id");
    expect(sql).toContain("conflicting activity attempt retry");
    expect(sql).toContain("conflicting activity event retry");
    expect(sql).toContain("conflicting case attempt retry");
    expect(sql).toContain("conflicting case event retry");
  });

  it("keeps every V3 table protected for both reads and writes", () => {
    const sql = v3MigrationSql();
    for (const table of [
      "activity_attempts",
      "activity_events",
      "course_enrollments",
      "course_step_events",
    ]) {
      expect(sql).toMatch(new RegExp(
        `on public\\.${table} for all using \\(auth\\.uid\\(\\) = user_id\\) with check \\(auth\\.uid\\(\\) = user_id\\)`,
      ));
    }
    expect(sql.match(/auth\.uid\(\) is distinct from p_user_id/g)).toHaveLength(2);
  });

  it("forms an ordered additive 001-to-004 upgrade contract", () => {
    const migrations = [
      migrationSql(),
      v2MigrationSql(),
      caseEventEvidenceMigrationSql(),
      v3MigrationSql(),
    ];
    expect(migrations.every((sql) => !/drop table|truncate|delete from/.test(sql))).toBe(true);
    expect(migrations[0]).toContain("create table public.case_attempts");
    expect(migrations[1]).toContain("add column if not exists scoring_version");
    expect(migrations[2]).toContain("drop constraint if exists case_attempts_v2_metadata_check");
    expect(migrations[3]).toContain("drop constraint if exists case_attempts_v2_metadata_check");
    expect(migrations[3]).toContain("scoring_version = 'v1'");
    expect(migrations[3]).toContain("scoring_version = 'v2'");
    expect(migrations[3]).toContain("scoring_version = 'v3'");
  });
});
