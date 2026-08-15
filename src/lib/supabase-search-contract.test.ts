import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");
const migrationName = readdirSync(migrationsDirectory).find((file) =>
  file.endsWith("_public_search_products_rpc_contract.sql"),
);

const sql = migrationName
  ? readFileSync(join(migrationsDirectory, migrationName), "utf8")
  : "";

describe("public search RPC contract", () => {
  it("keeps public search invoker-safe and least-privilege", () => {
    expect(sql).toContain("security invoker");
    expect(sql).toContain("left join public.categories");
    expect(sql).toContain("p.category_id is null or c.is_active");
    expect(sql).toContain("revoke execute on function public.search_products");
    expect(sql).toContain("grant execute on function public.search_products");
    expect(sql).not.toContain("security definer");
  });

  it("returns an explicit public item shape instead of products rows", () => {
    expect(sql).toContain("'categorySlug'");
    expect(sql).toContain("'inventory'");
    expect(sql).toContain("'pageSize', 24");
    expect(sql).toContain("'categories'");
    expect(sql).not.toContain("to_jsonb(paged)");
  });
});
