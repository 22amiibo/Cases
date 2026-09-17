import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/001_initial.sql",
);

function migrationSql() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
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
  });
});
