# Admin Product Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible, instant client-side search field to `/admin/produkte` that filters the existing admin catalog by product metadata while preserving list/grid views and product actions.

**Architecture:** Keep the page server-rendered and keep the existing `AdminProductCatalog` client boundary. Add a small pure helper that treats blank input as the full catalog and delegates non-blank input to the existing `searchProducts` function. The client component owns only the transient query and renders a toolbar, result count, filtered list/grid, and no-results state.

**Tech Stack:** Next.js 16 App Router, React 19 client component, TypeScript, Vitest, CSS modules-by-convention via `src/app/styles/admin.css`, lucide-react icons.

## Global Constraints

- Search is client-side and updates as the user types.
- Search matches product name, brand, SKU, aliases, category name, and product specification values through the existing catalog search behavior.
- German diacritics and case differences remain normalized by the existing `normalizeSearch`/`searchProducts` helpers.
- The current list/grid view, product links, status controls, and admin-only write permissions remain unchanged.
- Empty input shows the full catalog.
- A non-empty query with no matches shows `Keine Produkte gefunden` plus a clear-search button.
- The search control is keyboard accessible, labeled in German, and remains usable on the existing mobile layout.
- Do not add a database query, API route, URL parameter, persistent state, or dependency.

## File Map

- Create: `src/lib/admin-product-search.ts` — pure admin-specific query-to-product filtering boundary.
- Create: `src/lib/admin-product-search.test.ts` — behavior tests for blank, SKU, and no-match queries.
- Modify: `src/components/admin-product-catalog.tsx` — query state, search toolbar, result count, clear control, filtered rendering, and empty state.
- Modify: `src/app/styles/admin.css` — toolbar, search field, result count, empty state, and mobile layout styles.
- No changes: `src/app/admin/produkte/page.tsx` — the existing server data flow already passes the complete product array.

### Task 1: Add the filtering boundary with tests first

**Files:**
- Create: `src/lib/admin-product-search.test.ts`
- Create: `src/lib/admin-product-search.ts`

**Interfaces:**
- Produces `filterAdminProducts(query: string, productItems: Product[]): Product[]`.
- Consumes `Product` from `src/lib/types.ts` and `searchProducts` from `src/lib/catalog.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/admin-product-search.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterAdminProducts } from "./admin-product-search";
import { products } from "./catalog-data";

const product = products.find((item) => item.sku === "00002886")!;
const otherProduct = products.find((item) => item.sku === "00579400")!;
const sampleProducts = [product, otherProduct];

describe("admin product search", () => {
  it("returns the full catalog for a blank query", () => {
    expect(filterAdminProducts("  ", sampleProducts)).toEqual(sampleProducts);
  });

  it("finds a product by SKU and excludes unrelated products", () => {
    expect(filterAdminProducts("00002886", sampleProducts)).toEqual([product]);
  });

  it("returns no products for a non-matching query", () => {
    expect(filterAdminProducts("nicht vorhanden", sampleProducts)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec vitest run src/lib/admin-product-search.test.ts`

Expected: FAIL because `src/lib/admin-product-search.ts` and
`filterAdminProducts` do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/admin-product-search.ts`:

```ts
import { searchProducts } from "./catalog";
import type { Product } from "./types";

export function filterAdminProducts(query: string, productItems: Product[]) {
  return query.trim() ? searchProducts(query, productItems) : productItems;
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm exec vitest run src/lib/admin-product-search.test.ts`

Expected: 3 tests pass with exit code 0.

- [ ] **Step 5: Commit the pure filtering boundary**

Run:

```bash
git add src/lib/admin-product-search.ts src/lib/admin-product-search.test.ts
git commit -m "feat: add admin product search helper"
```

### Task 2: Add search controls and filtered rendering

**Files:**
- Modify: `src/components/admin-product-catalog.tsx`

**Interfaces:**
- Consumes `filterAdminProducts(query, products)` from Task 1.
- Preserves the existing `AdminProductCatalogProps`, `ProductStatus`, view mode,
  product links, and status form behavior.

- [ ] **Step 1: Add query state and filtering**

Import `Search` and `X` from `lucide-react`, import `filterAdminProducts`, and
add `const [query, setQuery] = useState("");` beside the existing view state.
Derive `const filteredProducts = filterAdminProducts(query, products);` during
render. Keep `products` as the source for the full catalog and do not mutate it.

- [ ] **Step 2: Add the accessible search toolbar**

Replace the current standalone view switcher wrapper with an
`admin-product-toolbar` containing:

```tsx
<label className="admin-product-search">
  <Search aria-hidden="true" />
  <span className="sr-only">Produkte durchsuchen</span>
  <input
    type="search"
    value={query}
    onChange={(event) => setQuery(event.target.value)}
    placeholder="Name, Marke oder Artikelnummer"
    autoComplete="off"
  />
  {query && (
    <button type="button" aria-label="Suche leeren" onClick={() => setQuery("")}>
      <X aria-hidden="true" />
    </button>
  )}
</label>
<span className="admin-product-result-count" aria-live="polite">
  {filteredProducts.length} {filteredProducts.length === 1 ? "Produkt" : "Produkte"}
</span>
```

Keep the existing `admin-view-switcher` as the second toolbar child so list/grid
buttons keep their current behavior and labels.

- [ ] **Step 3: Render the no-results state**

Before the existing list/grid conditional, render this branch when
`filteredProducts.length === 0`:

```tsx
<div className="admin-product-empty" role="status">
  <strong>Keine Produkte gefunden</strong>
  <span>Versuche einen anderen Suchbegriff.</span>
  <button type="button" onClick={() => setQuery("")}>Suche leeren</button>
</div>
```

Otherwise render the existing list/grid markup with `filteredProducts.map(...)`
in both branches. Do not change the product status form or links.

- [ ] **Step 4: Run type-aware lint**

Run: `pnpm lint`

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 5: Commit the component behavior**

Run:

```bash
git add src/components/admin-product-catalog.tsx
git commit -m "feat: add admin product search controls"
```

### Task 3: Style the toolbar and empty state responsively

**Files:**
- Modify: `src/app/styles/admin.css`

**Interfaces:**
- Styles the class names introduced by Task 2 without changing global button,
  table, product-card, or navigation behavior.

- [ ] **Step 1: Add desktop toolbar styles**

Add styles near `.admin-product-browser`:

```css
.admin-product-toolbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.admin-product-search {
  min-height: 38px;
  min-width: min(100%, 360px);
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: white;
  color: var(--muted);
}

.admin-product-search:focus-within {
  border-color: #b9d5c0;
  box-shadow: 0 0 0 3px rgb(185 213 192 / 0.22);
}

.admin-product-search > svg {
  width: 16px;
  flex: 0 0 16px;
}

.admin-product-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 12px;
}

.admin-product-search input::placeholder {
  color: #87948c;
}

.admin-product-search button {
  width: 24px;
  height: 24px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.admin-product-search button:hover {
  background: #eef3ef;
  color: var(--ink);
}

.admin-product-search button svg {
  width: 14px;
}

.admin-product-result-count {
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

.admin-product-toolbar .admin-view-switcher {
  margin: 0 0 0 auto;
}

.admin-product-empty {
  min-height: 180px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: white;
  text-align: center;
}

.admin-product-empty strong {
  font-size: 16px;
}

.admin-product-empty span {
  color: var(--muted);
  font-size: 12px;
}

.admin-product-empty button {
  margin-top: 8px;
  border: 0;
  border-bottom: 1px solid currentColor;
  background: transparent;
  color: var(--green);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
```

- [ ] **Step 2: Add mobile toolbar rules**

Inside the existing `@media (max-width: 700px)` block, add:

```css
  .admin-product-toolbar {
    align-items: stretch;
    flex-wrap: wrap;
    gap: 9px;
  }
  .admin-product-search {
    min-width: 100%;
    order: -2;
  }
  .admin-product-result-count {
    align-self: center;
  }
  .admin-product-toolbar .admin-view-switcher {
    margin-left: auto;
  }
```

- [ ] **Step 3: Run formatting check**

Run: `pnpm format:check`

Expected: exit code 0. If Prettier reports formatting in the changed files,
run `pnpm exec prettier --write src/lib/admin-product-search.ts src/lib/admin-product-search.test.ts src/components/admin-product-catalog.tsx src/app/styles/admin.css` and rerun the check.

- [ ] **Step 4: Commit the styles**

Run:

```bash
git add src/app/styles/admin.css
git commit -m "style: polish admin product search"
```

### Task 4: Full verification and browser check

**Files:**
- Verify: `src/lib/admin-product-search.test.ts`
- Verify: `src/components/admin-product-catalog.tsx`
- Verify: `src/app/styles/admin.css`

- [ ] **Step 1: Run the full automated checks**

Run:

```bash
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

Expected: each command exits 0; Vitest reports all tests passing; lint and
format report no errors; Next.js production build completes successfully.

- [ ] **Step 2: Verify the existing local browser route**

Open `http://localhost:3000/admin/produkte` in the already-running local app
and verify:

1. The search input is visible above the catalog and has the placeholder
   `Name, Marke oder Artikelnummer`.
2. Typing `00002886` leaves the matching product visible and updates the result
   count to `1 Produkt`.
3. Clicking the clear icon restores all products.
4. Typing an unmatched query shows `Keine Produkte gefunden` and the clear
   action restores the catalog.
5. Grid/List switching still works while filtered and unfiltered.
6. The input and toolbar remain usable at the narrow viewport shown in the
   reported browser comment.

- [ ] **Step 3: Review the final diff and status**

Run:

```bash
git diff HEAD~3 -- src/lib/admin-product-search.ts src/lib/admin-product-search.test.ts src/components/admin-product-catalog.tsx src/app/styles/admin.css
git status --short
```

Expected: only the intended search helper, test, component, and styles are
changed relative to the implementation commits; pre-existing user changes in
other files remain untouched.
