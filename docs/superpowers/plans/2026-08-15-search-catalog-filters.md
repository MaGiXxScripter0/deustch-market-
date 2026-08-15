# Search Catalog Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full `/sortiment` filter experience to `/suche`, while keeping the current search query active in the URL and filter results.

**Architecture:** Reuse the existing client-side `CatalogView` and `CatalogFilterPanel`. Extend `CatalogView` with an optional initial search query, feed that query into the existing `filterProducts` pipeline, and make category selection a query parameter for the search context. Keep search correction and the search hero in the server page.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, existing `filterProducts` catalog utility.

## Global Constraints

- Preserve the existing `q` search parameter when changing filters or sorting.
- Reset filter parameters without removing `q`.
- Do not change catalog data, Supabase schema, RPCs, or server-side repository behavior.
- Follow the existing App Router and client `useSearchParams` conventions in this repository.
- Keep the existing mobile filter drawer and filter panel styling.

---

### Task 1: Extend the shared catalog filter state

**Files:**
- Modify: `src/components/catalog-view.tsx`
- Modify: `src/components/catalog-filter-panel.tsx`
- Test: `src/lib/catalog.test.ts` (only if a regression test is needed for combined query/category filtering)

**Interfaces:**
- `CatalogView` consumes optional `initialQuery?: string` and existing URL parameters.
- `CatalogView` produces filtered products by passing `q` and `category` into `filterProducts`.
- `CatalogFilterPanel` consumes `activeCategoryFilter?: string` and a `setParam` callback.
- Category controls produce `category=<slug>` changes in the current URL when used by `/sortiment` or `/suche`.

- [ ] **Step 1: Add URL state for category and query-aware filtering**

  In `CatalogView`, read `params.get("category")`, accept `initialQuery`, and construct the filter call with:

  ```ts
  filterProducts(
    {
      q: initialQuery,
      category: categoryFilter || undefined,
      brands: activeBrands,
      availability: availability ? "pickup" : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      specs,
      sort: sort as "featured" | "price-asc" | "price-desc" | "name",
    },
    initialProducts,
    categories,
  )
  ```

- [ ] **Step 2: Make category selection preserve the current page context**

  Replace the category `Link` controls in `CatalogFilterPanel` with checked controls that call `setParam("category", category.slug)` and an “Alle Kategorien” control that removes the parameter. Keep category counts based on the component’s source list. Pass the active category filter from `CatalogView`.

- [ ] **Step 3: Include category in active-filter and reset behavior**

  Add `Boolean(categoryFilter)` to `hasFilters`, show the active category in `filter-chips`, and ensure reset clears filter parameters while preserving the search query. Use a dedicated reset query built from `params` rather than `router.push("?")` so `q` remains intact.

- [ ] **Step 4: Add a focused utility regression test**

  Add a test in `src/lib/catalog.test.ts` only if the existing suite does not already cover it, asserting that `filterProducts({ q: "Bauplatte", category: "..." }, products, categories)` returns only products matching both conditions. Run the focused catalog test before continuing.

  ```powershell
  pnpm exec vitest run src/lib/catalog.test.ts
  ```

- [ ] **Step 5: Commit the shared filter-state change**

  ```powershell
  git add src/components/catalog-view.tsx src/components/catalog-filter-panel.tsx src/lib/catalog.test.ts
  git commit -m "feat: support category filters in shared catalog view"
  ```

### Task 2: Connect `/suche` to `CatalogView`

**Files:**
- Modify: `src/app/suche/page.tsx`

**Interfaces:**
- The server page consumes `q`, `categories`, and the full `products` list.
- It produces the existing search hero/correction plus a `CatalogView` configured with `initialQuery={query}`.

- [ ] **Step 1: Replace the direct result grid with the shared catalog view**

  Keep the breadcrumbs, hero text, correction suggestion, and result count copy. Remove the direct `ProductCard` result grid and the old no-results/popular-products branch. Render:

  ```tsx
  <Suspense fallback={<div className="loading-card">Produkte werden geladen …</div>}>
    <CatalogView
      initialProducts={products}
      categories={categories}
      brands={getBrands(products)}
      initialQuery={query}
    />
  </Suspense>
  ```

  Update the hero count to reflect the filtered search baseline only if necessary; the catalog toolbar becomes the authoritative count after filters.

- [ ] **Step 2: Verify URL behavior in the component code**

  Confirm that `/suche?q=Bauplatte` passes `q` into `CatalogView`, that filter actions generate URLs such as `/suche?q=Bauplatte&category=...&brand=...`, and that reset returns to `/suche?q=Bauplatte`.

- [ ] **Step 3: Commit the search-page integration**

  ```powershell
  git add src/app/suche/page.tsx
  git commit -m "feat: add catalog filters to product search"
  ```

### Task 3: Verify behavior and quality

**Files:**
- Modify: only files needed to correct failures found during verification.

- [ ] **Step 1: Run formatting/lint/type checks**

  ```powershell
  pnpm lint
  pnpm exec tsc --noEmit
  ```

  Expected: both commands complete without errors.

- [ ] **Step 2: Run the full test suite**

  ```powershell
  pnpm test
  ```

  Expected: all existing and newly added tests pass.

- [ ] **Step 3: Perform a browser smoke test**

  Start the existing dev server if needed and open `/suche?q=Bauplatte`. Verify:

  - category, availability, brand, price, specification, and sort controls are visible;
  - selecting category and another filter narrows the products;
  - the URL keeps `q=Bauplatte` and all selected filters;
  - reset removes filters but keeps `q=Bauplatte`;
  - mobile filter drawer opens, applies, and closes correctly;
  - a zero-result combination shows the standard catalog empty state.

- [ ] **Step 4: Inspect the final diff**

  ```powershell
  git diff --check HEAD~2..HEAD
  git status --short
  ```

  Confirm that only the intended search/filter files and tests are changed, and that unrelated pre-existing worktree changes remain untouched.
