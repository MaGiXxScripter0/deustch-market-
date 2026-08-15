import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260815170000_grant_search_function_execute.sql";

describe("catalog search function permissions", () => {
  it("allows authenticated product updates to recalculate search_document", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      "grant execute on function public.array_to_search_text(text[]) to authenticated;",
    );
    expect(migration).not.toContain("to public, anon, authenticated");
  });
});
