# Admin Category Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category search and guarded deletion while retaining formerly categorised products as uncategorised products.

**Architecture:** Keep `/admin/kategorien` as a Server Component for data access, and introduce a small Client Component that owns category filtering and the deletion dialog. A server action authorizes and verifies deletion; a database migration turns the product foreign key into `ON DELETE SET NULL`. The catalog model represents an absent category as `null` so public catalog/search views keep products visible while category pages exclude them naturally.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres, Zod, Vitest, lucide-react.

## Global Constraints

- Use the current Next.js App Router server/client component boundary: only interactive controls are Client Components.
- Deletion requires an admin session and an exact, case-sensitive match of the stored category name on both client and server.
- Deleting a category must never delete its products; the database foreign key clears `products.category_id`.
- Products without a category remain in `/sortiment`, `/suche`, and product detail pages; they are excluded from individual category pages and navigation.
- Existing user changes outside the listed files must remain untouched.

---

### Task 1: Make category assignment optional in storage and catalog types

**Files:**
- Create: `supabase/migrations/20260815160000_allow_uncategorized_products.sql`
- Modify: `src/lib/supabase/database.types.ts:199-261`
- Modify: `src/lib/types.ts:16`
- Modify: `src/lib/catalog-repository.ts:25-128`
- Modify: `src/lib/admin-product-validation.ts:3-25`
- Modify: `src/components/admin-product-form.tsx:44-76`
- Test: `src/lib/catalog-repository.test.ts`

**Interfaces:**
- Produces: `Product.categorySlug: string | null`.
- Produces: database product rows with `category_id: string | null`.
- Produces: product forms/actions that accept an empty `categoryId` and persist `null`.

- [ ] **Step 1: Write the failing catalog mapping test**

```ts
it("keeps a product without a category in the catalog", async () => {
  const catalog = await queryCatalogForTest({ category_id: null });
  expect(catalog.products[0]?.categorySlug).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/catalog-repository.test.ts`

Expected: FAIL because `DatabaseProduct.category_id` is non-nullable or the mapped value is an empty string.

- [ ] **Step 3: Add the nullable migration and type changes**

```sql
alter table public.products
  drop constraint products_category_id_fkey,
  alter column category_id drop not null,
  add constraint products_category_id_fkey
    foreign key (category_id) references public.categories (id) on delete set null;
```

```ts
// src/lib/types.ts
categorySlug: string | null;

// src/lib/catalog-repository.ts
category_id: string | null;
categorySlug: product.category_id ? (categoryById.get(product.category_id) ?? null) : null;
```

Change all three generated-style `category_id` definitions in `database.types.ts` to accept `null`. Change `productSchema.categoryId` to `z.union([z.guid(), z.literal("")])`, set `category_id: parsed.data.categoryId || null` in `saveProductAction`, and add `<option value="">Ohne Kategorie</option>` before category options while removing `required` from the select.

- [ ] **Step 4: Keep a category-less catalog from falling back to seed data**

```ts
if (categoryResult.error || productResult.error || !productResult.data?.length) {
  return { categories: fallbackCategories, products: fallbackProducts, source: "demo" };
}
```

The empty category array is valid; only a missing product result triggers the existing demo fallback.

- [ ] **Step 5: Run focused tests and type checking**

Run: `pnpm test src/lib/catalog-repository.test.ts src/lib/actions.test.ts`

Expected: PASS, including the new unassigned-product mapping test.

Run: `pnpm exec tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 6: Commit the task**

```bash
git add supabase/migrations/20260815160000_allow_uncategorized_products.sql src/lib/supabase/database.types.ts src/lib/types.ts src/lib/catalog-repository.ts src/lib/catalog-repository.test.ts src/lib/admin-product-validation.ts src/components/admin-product-form.tsx src/lib/actions.ts src/lib/actions.test.ts
git commit -m "feat: retain products without categories"
```

### Task 2: Add pure category search and deletion-confirmation rules

**Files:**
- Create: `src/lib/admin-category-management.ts`
- Create: `src/lib/admin-category-management.test.ts`

**Interfaces:**
- Consumes: `{ id, slug, name_de, description_de }` category records.
- Produces: `filterAdminCategories(query, categories)` and `isCategoryDeletionConfirmed(expectedName, confirmation)`.

- [ ] **Step 1: Write failing unit tests**

```ts
it("searches category name, slug, and description without case sensitivity", () => {
  expect(filterAdminCategories("FASSADE", categories)).toEqual([categories[0]]);
  expect(filterAdminCategories("platten", categories)).toEqual([categories[1]]);
  expect(filterAdminCategories("wärme", categories)).toEqual([categories[2]]);
});

it("only accepts the exact category name for deletion", () => {
  expect(isCategoryDeletionConfirmed("Dämmung", "Dämmung")).toBe(true);
  expect(isCategoryDeletionConfirmed("Dämmung", "dämmung")).toBe(false);
  expect(isCategoryDeletionConfirmed("Dämmung", "Dämmung ")).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/admin-category-management.test.ts`

Expected: FAIL because the helper module is absent.

- [ ] **Step 3: Implement the smallest helper API**

```ts
export function filterAdminCategories<T extends CategorySearchRecord>(query: string, categories: T[]) {
  const value = query.trim().toLocaleLowerCase("de-DE");
  if (!value) return categories;
  return categories.filter((category) =>
    [category.name_de, category.slug, category.description_de]
      .some((field) => field.toLocaleLowerCase("de-DE").includes(value)),
  );
}

export function isCategoryDeletionConfirmed(expectedName: string, confirmation: string) {
  return confirmation === expectedName;
}
```

- [ ] **Step 4: Run the focused test**

Run: `pnpm test src/lib/admin-category-management.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add src/lib/admin-category-management.ts src/lib/admin-category-management.test.ts
git commit -m "feat: add category management helpers"
```

### Task 3: Implement authorized, server-verified category deletion

**Files:**
- Modify: `src/lib/actions.ts:356-425`
- Modify: `src/lib/actions.test.ts`

**Interfaces:**
- Consumes: `deleteCategoryAction(_: ActionState, formData: FormData)` with `id` and `confirmation` fields.
- Produces: `{ success: "Kategorie wurde gelöscht." }` or an error string; invalid confirmation must never issue `.delete()`.

- [ ] **Step 1: Write failing action validation tests**

```ts
it("rejects an empty category confirmation", () => {
  expect(deleteCategorySchema.safeParse({ id: categoryId, confirmation: "" }).success).toBe(false);
});

it("accepts an identifier and a non-empty confirmation for server comparison", () => {
  expect(deleteCategorySchema.safeParse({ id: categoryId, confirmation: "Dämmung" }).success).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/actions.test.ts`

Expected: FAIL because `deleteCategorySchema` does not exist.

- [ ] **Step 3: Add the action and server-side checks**

```ts
export const deleteCategorySchema = z.object({
  id: z.guid(),
  confirmation: z.string().min(1).max(120),
});

export async function deleteCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return { error: "Keine Administratorberechtigung." };
  const parsed = deleteCategorySchema.safeParse({ id: formData.get("id"), confirmation: formData.get("confirmation") });
  if (!parsed.success) return { error: "Bitte geben Sie den Kategorienamen ein." };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  const { data: category, error: readError } = await supabase.from("categories").select("name_de").eq("id", parsed.data.id).maybeSingle();
  if (readError || !category) return { error: "Kategorie wurde nicht gefunden." };
  if (category.name_de !== parsed.data.confirmation) return { error: "Der eingegebene Name stimmt nicht überein." };
  const { error } = await supabase.from("categories").delete().eq("id", parsed.data.id);
  if (error) return { error: `Löschen fehlgeschlagen: ${error.message}` };
  updateTag("catalog");
  revalidatePath("/admin/kategorien");
  revalidatePath("/admin/produkte");
  revalidatePath("/sortiment");
  revalidatePath("/suche");
  return { success: "Kategorie wurde gelöscht." };
}
```

- [ ] **Step 4: Run action tests**

Run: `pnpm test src/lib/actions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add src/lib/actions.ts src/lib/actions.test.ts
git commit -m "feat: verify category deletion on the server"
```

### Task 4: Build the searchable category list and deletion dialog

**Files:**
- Create: `src/components/admin-category-catalog.tsx`
- Modify: `src/app/admin/kategorien/page.tsx:1-84`
- Modify: `src/app/styles/admin.css:1108-1184`
- Modify: `src/app/produkt/[slug]/page.tsx:44-59`

**Interfaces:**
- Consumes: `categories: AdminCategoryRecord[]`, `productCounts: Record<string, number>`, and `enabled: boolean`.
- Uses: `filterAdminCategories`, `isCategoryDeletionConfirmed`, `deleteCategoryAction`, `AdminCategoryForm`, and `toggleCategoryAction`.
- Produces: an accessible search field, no-results state, category edit rows, and a `<dialog>` deletion form.

- [ ] **Step 1: Write failing helper-level UI contract tests**

```ts
it("returns only categories matched by the search input", () => {
  expect(filterAdminCategories("dach", categories)).toEqual([dachCategory]);
});

it("keeps destructive submit disabled until exact text is entered", () => {
  expect(isCategoryDeletionConfirmed(category.name_de, "Dach")).toBe(false);
  expect(isCategoryDeletionConfirmed(category.name_de, category.name_de)).toBe(true);
});
```

- [ ] **Step 2: Run the contract tests**

Run: `pnpm test src/lib/admin-category-management.test.ts`

Expected: PASS; the task composes the already-tested rules without introducing a browser-only test dependency.

- [ ] **Step 3: Implement the client component**

Render a `type="search"` control with a clear button and `aria-live` result count. Filter the passed list with `filterAdminCategories`. Keep `selectedCategory`, `confirmation`, and `dialogRef` local. The destructive action must be a `useActionState(deleteCategoryAction, {})` form containing hidden `id` and editable `confirmation`; its submit button has `disabled={!enabled || pending || !isCategoryDeletionConfirmed(selectedCategory.name_de, confirmation)}`. Use `dialog.showModal()`, `dialog.close()`, a cancel button, `onCancel`, and `onClick` backdrop detection to close without side effects. Reset confirmation when selecting or closing a category.

Inside each category row, retain the existing details summary, `AdminCategoryForm`, and `toggleCategoryAction` form. Add a separate `type="button"` labelled `Kategorie löschen` after the toggle form; it opens the dialog only when `enabled` is true. Render the category product count from `productCounts[category.slug] ?? 0` and say in the dialog that these products will continue as `Ohne Kategorie`.

- [ ] **Step 4: Replace the page-local category list with the client component**

Keep the existing server-side category query and fallback mapping. Build `productCounts` once with a `reduce` over products whose `categorySlug` is non-null, then render:

```tsx
<AdminCategoryCatalog
  categories={categories}
  enabled={enabled}
  productCounts={productCounts}
/>
```

The create-category disclosure stays above this component.

- [ ] **Step 5: Make product detail breadcrumbs safe for uncategorised products**

Replace the unconditional category link with a conditional link. For `category === undefined`, show only `Startseite / Sortiment / {product.name}`. Keep related products limited to matching non-null `categorySlug`; uncategorised products have no category-based related list.

- [ ] **Step 6: Add scoped dialog and search styles**

Add `.admin-category-toolbar`, `.admin-category-search`, `.admin-category-empty`, `.admin-category-delete`, and `.admin-category-delete-dialog` rules under the existing category styles. The dialog must have a dimmed backdrop, readable error text, clear destructive button styling, and a single-column mobile layout; do not change global button or input rules.

- [ ] **Step 7: Run checks and manually exercise the page**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm lint`

Expected: exit code 0.

Run: `pnpm exec tsc --noEmit`

Expected: exit code 0.

In the running app, visit `http://localhost:3000/admin/kategorien`; search a category, open deletion, verify the button remains disabled for wrong text, confirm with exact text, then verify affected products appear under `Ohne Kategorie` in `/admin/produkte` and remain in `/sortiment` and `/suche`.

- [ ] **Step 8: Commit the task**

```bash
git add src/components/admin-category-catalog.tsx src/app/admin/kategorien/page.tsx src/app/styles/admin.css src/app/produkt/[slug]/page.tsx
git commit -m "feat: manage and safely delete categories"
```

