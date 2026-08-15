# Catalog-Scoped Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-synchronized search for categories and products on `/sortiment`, with the same query scoped to products on `/kategorie/[slug]`.

**Architecture:** Keep page data server-rendered and add the interactive search form to the existing client-side catalog filter panel. Read `q` from the current URL, filter the existing product list through `filterProducts`, filter category links by the same normalized query, and preserve all query parameters while navigating or resetting search.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing catalog utilities, Vitest, existing CSS.

## Global Constraints

- Store the search text in URL parameter `q`.
- Preserve category context through `/kategorie/{slug}` and preserve `q` when navigating to a category.
- On a category page, search only the products already scoped to that category.
- Keep existing filters, sorting, mobile drawer behavior, global header search, catalog data, database schema, and repository behavior unchanged.
- Reuse `normalizeSearch` and `searchProducts`; do not introduce a new search engine or ranking system.
- Keep the input accessible with `type="search"`, a screen-reader label, a German placeholder, and a clear action.

---

### Task 1: Add query-aware catalog filtering and tests

**Files:**
- Modify: `src/components/catalog-view.tsx`
- Test: `src/lib/catalog.test.ts`

**Interfaces:**
- `CatalogView` consumes `q` from `useSearchParams()` and its existing `activeCategory` prop.
- `CatalogView` produces `filterProducts({ q, category: activeCategory, ... })` results.

- [ ] **Step 1: Write the regression tests**

Add focused tests for `filterProducts` in `src/lib/catalog.test.ts` using the existing fixture imports. Cover:

```ts
it("combines text search with a category scope", () => {
  const result = filterProducts(
    { q: "Bauplatte", category: "trockenbau" },
    products,
    categories,
  );

  expect(result.length).toBeGreaterThan(0);
  expect(result.every((product) => product.categorySlug === "trockenbau")).toBe(true);
});
```

Also add category matching assertions for the exported `filterCategories` helper introduced in Task 2, using the category name, short name, and description cases.

- [ ] **Step 2: Run the focused tests to establish the baseline**

Run:

```powershell
pnpm exec vitest run src/lib/catalog.test.ts
```

Expected: the existing catalog test file passes; this test locks the combined query/category contract before the UI wiring changes.

- [ ] **Step 3: Read URL query and pass it through the existing filter pipeline**

In `CatalogView`, add:

```ts
const query = params.get("q")?.trim() ?? "";
```

Pass `q: query || undefined` and `category: activeCategory` into `filterProducts`, while keeping all existing brand, availability, price, spec, and sort values unchanged.

Include `query` in the `useMemo` dependency list. Use the existing `initialProducts` behavior so category pages remain scoped automatically.

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run:

```powershell
pnpm exec vitest run src/lib/catalog.test.ts
```

Expected: all catalog tests pass.

- [ ] **Step 5: Commit the filtering change**

```powershell
git add src/components/catalog-view.tsx src/lib/catalog.test.ts
git commit -m "feat: scope catalog search to active category"
```

### Task 2: Add the catalog search form and category results

**Files:**
- Modify: `src/components/catalog-filter-panel.tsx`
- Modify: `src/components/catalog-view.tsx`
- Modify: `src/app/styles/catalog.css`
- Test: `src/lib/catalog.test.ts`

**Interfaces:**
- Add `filterCategories(query: string, categories: Category[]): Category[]` to `src/lib/catalog.ts`; it must use `normalizeSearch` and match `name`, `shortName`, or `description`.
- The search form submits to the current pathname with existing URL parameters plus `q`.
- Category links preserve the current `q` by building URLs from the current `URLSearchParams`.

- [ ] **Step 1: Add the failing category filtering test**

If the helper is exported from `src/lib/catalog.ts`, add tests in `src/lib/catalog.test.ts`:

```ts
it("finds categories by name, short name, and description", () => {
  expect(filterCategories("Trockenbau", categories).length).toBe(1);
  expect(filterCategories("Dämm", categories).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
pnpm exec vitest run src/lib/catalog.test.ts
```

Expected: FAIL because `filterCategories` does not exist yet.

- [ ] **Step 3: Implement the search form and filtered category links**

In `CatalogFilterPanel`:

- Read the current query from props supplied by `CatalogView`.
- Render a labeled `form` with `method="get"`, `role="search"`, `type="search"`, current `q` value, and a submit button.
- Preserve all existing URL parameters on submit except replace `q` with the submitted value; omit `q` when empty.
- Render a clear button that removes only `q` while preserving all other parameters.
- On `/sortiment`, filter the category list using `name`, `shortName`, and `description`.
- Build category links to `/kategorie/${slug}` while preserving the current `q` and omitting unrelated transient filter parameters.
- Show a stable German empty message when no category matches; do not hide product results.
- On a category page, omit the global category list as today, but show the search context using the active category name in the label/placeholder.

In `CatalogView`, pass `query`, `pathname`, and the category data needed by the panel. Use `usePathname()` for the current route and keep route navigation within the current page.

- [ ] **Step 4: Add styling matching the existing filter panel**

In `src/app/styles/catalog.css`, add styles for the search block, search input/button, focus state, clear action, category-empty message, and active search context. Keep the existing 230px desktop sidebar, mobile drawer, spacing, colors, and responsive behavior.

- [ ] **Step 5: Run focused tests and lint the changed files**

Run:

```powershell
pnpm exec vitest run src/lib/catalog.test.ts
pnpm exec eslint src/components/catalog-view.tsx src/components/catalog-filter-panel.tsx src/lib/catalog.ts src/lib/catalog.test.ts
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit the search UI change**

```powershell
git add src/components/catalog-view.tsx src/components/catalog-filter-panel.tsx src/app/styles/catalog.css src/lib/catalog.ts src/lib/catalog.test.ts
git commit -m "feat: add URL-synced catalog search UI"
```

### Task 3: Verify global and category-scoped flows

**Files:**
- Modify: only files needed to fix verification failures.

- [ ] **Step 1: Run project checks**

Run:

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm test
```

Expected: all commands pass. Existing unrelated worktree changes must remain untouched.

- [ ] **Step 2: Verify `/sortiment` in the browser**

Open `/sortiment` and verify:

- entering `platte` and submitting produces `/sortiment?q=platte`;
- category links are filtered by the same query;
- product results are filtered by the same query;
- clearing search removes only `q`;
- selecting brand, availability, price, specs, and sorting preserves `q`;
- resetting filters preserves `q`.

- [ ] **Step 3: Verify category-scoped search in the browser**

Open `/kategorie/trockenbau?q=platte` and verify:

- the query remains visible in the search field;
- every visible product belongs to `trockenbau`;
- changing search updates only the category’s products;
- the category context remains visible;
- clearing search returns all products in the category.

- [ ] **Step 4: Verify mobile and empty states**

At the mobile viewport, open the filter drawer and confirm the search form remains keyboard accessible and the apply/close flow still works. Test a query with no product matches and a query with product matches but no category matches; both states must be understandable.

- [ ] **Step 5: Inspect the final diff**

Run:

```powershell
git diff --check HEAD~2..HEAD
git status --short
```

Confirm only the intended catalog search files and commits are included; preserve all pre-existing user changes.
