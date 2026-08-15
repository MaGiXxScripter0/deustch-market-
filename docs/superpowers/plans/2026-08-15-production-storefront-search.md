# Production Storefront Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести поиск товаров и категорий на единый серверный контракт с Supabase RPC, исправить URL-state и обеспечить релевантность, фасеты, пагинацию, доступный autocomplete и согласованные результаты на `/suche`, `/sortiment` и `/kategorie/[slug]`.

**Architecture:** URL является единственным источником состояния поиска. Server Components валидируют параметры, вызывают `search_products` через server-only repository и передают клиентским компонентам только текущую страницу товаров, фасеты и нормализованное состояние; при отсутствии Supabase тот же контракт реализуется локальным demo-fallback. SQL-функция остаётся `SECURITY INVOKER`, возвращает только публично разрешённые поля и одинаково обрабатывает активные категории, товары без категории, выбранный магазин и детерминированную пагинацию.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TypeScript 5, Supabase/Postgres FTS + `pg_trgm`, Zod 4, Vitest 4, Tailwind/existing CSS, pnpm 11.

## Global Constraints

- Весь пользовательский текст и aria-copy остаются только на немецком языке.
- Использовать `q`, `category`, повторяющиеся `brand`, повторяющиеся `spec`, `availability`, `minPrice`, `maxPrice`, `sort` и `page` в URL.
- Изменение `q`, категории, фильтра или сортировки всегда удаляет `page`; первая страница не сериализуется.
- На `/kategorie/[slug]` slug маршрута является обязательным scope; query-параметр `category` игнорируется и не сериализуется.
- Очистка поиска удаляет только `q` и `page`; `Alle zurücksetzen` удаляет фильтры, сортировку и `page`, сохраняя текущий `q`.
- Публичный поиск показывает активные товары активных категорий и активные товары без категории; товары неактивных категорий не показываются.
- Наличие `pickup` относится только к `siteConfig.pickupLocationSlug` (`baumarkt-nassauer-land`), а не к любой локации.
- Размер страницы фиксирован: 24 товара. Не добавлять перегруженную RPC-сигнатуру с `page_size`.
- Не изменять уже применённые миграции; новую миграцию создавать только через `pnpm dlx supabase migration new`.
- RPC остаётся `SECURITY INVOKER`; не использовать `SECURITY DEFINER` для публичного поиска.
- Не возвращать из RPC `p.*`, `search_document`, `score`, `source_url`, `last_synced_at` или другие внутренние поля.
- Не устанавливать новую поисковую библиотеку или внешний SaaS поиска в рамках этого плана.
- Не выполнять `git reset`, `git checkout`, `git stash` или массовый `pnpm format`: рабочее дерево содержит пользовательские изменения.
- Перед изменением поведения Next.js сверяться с `node_modules/next/dist/docs/`; перед применением миграции сверяться с актуальными Supabase FTS, RPC, RLS и CLI docs.

## File Structure

- Create `src/lib/catalog-query.ts`: parse/serialize URL-state без React и Next.js.
- Create `src/lib/catalog-query.test.ts`: unit-контракт URL-state.
- Create `src/lib/catalog-search.ts`: server-side RPC/fallback orchestration и проверка JSON-контракта.
- Create `src/lib/catalog-search.test.ts`: mapping, fallback, pagination и visibility tests.
- Modify `src/lib/types.ts`: общие типы query/result/facets/suggestions.
- Modify `src/lib/catalog.ts`: локальный fallback с теми же searchable fields и результатами, что RPC.
- Modify `src/lib/catalog-repository.ts`: отдельная загрузка категорий/admin-каталога; публичные страницы перестают загружать все товары.
- Create via Supabase CLI: migration named `public_search_products_rpc_contract` containing RPC/RLS/grant changes.
- Modify `src/lib/supabase/database.types.ts`: только regeneration из фактической схемы после миграции.
- Create `src/lib/supabase-search-contract.test.ts`: статические least-privilege и RPC contract checks.
- Modify `src/components/catalog-view.tsx`: presentation shell, больше не фильтрует полный каталог в браузере.
- Modify `src/components/catalog-filter-panel.tsx`: URL controls на основе server facets.
- Create `src/components/catalog-category-results.tsx`: найденные категории.
- Create `src/components/catalog-pagination.tsx`: доступная URL-pagination.
- Create `src/components/catalog-empty-state.tsx`: контекстные zero-result actions.
- Modify `src/components/search-autocomplete.tsx`: combobox keyboard/ARIA/state behavior.
- Modify `src/app/suche/page.tsx`, `src/app/sortiment/page.tsx`, `src/app/kategorie/[slug]/page.tsx`: единый Server Component data flow.
- Modify `src/app/api/suggestions/route.ts`: нормализованный ответ, validation и cache/error behavior.
- Modify `src/app/styles/catalog.css`, `src/app/styles/header-interactions.css`, `src/app/styles/responsive.css`: новые состояния без смены визуального языка.

---

### Task 1: Зафиксировать типизированный URL- и result-контракт

**Files:**

- Create: `src/lib/catalog-query.ts`
- Create: `src/lib/catalog-query.test.ts`
- Modify: `src/lib/types.ts:56`

**Interfaces:**

- Produces: `CatalogQuery`, `CatalogSort`, `CatalogSearchResult`, `CatalogFacets`, `CatalogFacetValue`, `CategorySearchHit`, `parseCatalogQuery()`, `buildCatalogHref()`.
- Consumes: `CatalogFilters`, `Product`, `Category`, `Fulfillment` from `src/lib/types.ts`.

- [ ] **Step 1: Добавить failing tests URL-контракта**

Создать `src/lib/catalog-query.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCatalogHref, parseCatalogQuery } from "./catalog-query";

describe("catalog query", () => {
  it("parses repeated filters and rejects invalid numbers and sort values", () => {
    const query = parseCatalogQuery({
      q: "  platte  ",
      brand: ["Knauf", "Rigips"],
      spec: ["Stärke:12,5 mm", "Eigenschaft:Feuchtraum", "invalid"],
      minPrice: "-2",
      maxPrice: "30",
      sort: "unknown",
      page: "0",
    });

    expect(query).toEqual({
      q: "platte",
      category: undefined,
      brands: ["Knauf", "Rigips"],
      availability: undefined,
      minPrice: undefined,
      maxPrice: 30,
      specs: { Stärke: ["12,5 mm"], Eigenschaft: ["Feuchtraum"] },
      sort: "relevance",
      page: 1,
    });
  });

  it("removes q without removing active filters and resets page", () => {
    const current = new URLSearchParams(
      "q=platte&brand=Knauf&availability=pickup&sort=price-asc&page=2",
    );

    expect(buildCatalogHref("/suche", current, { q: undefined })).toBe(
      "/suche?brand=Knauf&availability=pickup&sort=price-asc",
    );
  });

  it("resets filters while preserving q", () => {
    const current = new URLSearchParams(
      "q=platte&category=trockenbau-platten&brand=Knauf&spec=St%C3%A4rke%3A12%2C5+mm&page=2",
    );

    expect(buildCatalogHref("/suche", current, { resetFilters: true })).toBe("/suche?q=platte");
  });
});
```

- [ ] **Step 2: Запустить test и подтвердить RED**

Run:

```powershell
$env:Path='C:\Users\tarbu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\tarbu\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;'+$env:Path
pnpm exec vitest run src/lib/catalog-query.test.ts
```

Expected: FAIL because `catalog-query.ts` and its exports do not exist.

- [ ] **Step 3: Добавить общие типы**

В `src/lib/types.ts` добавить:

```ts
export type CatalogSort = "relevance" | "featured" | "price-asc" | "price-desc" | "name";

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export type CatalogQuery = {
  q: string;
  category?: string;
  brands: string[];
  availability?: Fulfillment;
  minPrice?: number;
  maxPrice?: number;
  specs: Record<string, string[]>;
  sort: CatalogSort;
  page: number;
};

export type CatalogFacetValue = { value: string; count: number };

export type CategorySearchHit = Pick<
  Category,
  "id" | "slug" | "name" | "shortName" | "description"
> & { count: number };

export type CatalogFacets = {
  categories: CategorySearchHit[];
  brands: CatalogFacetValue[];
  minPrice: number | null;
  maxPrice: number | null;
  specs: Record<string, CatalogFacetValue[]>;
};

export type CatalogSearchResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: 24;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  facets: CatalogFacets;
  correction?: string;
  source: "supabase" | "demo";
};

export type SearchSuggestion = {
  type: "product" | "category";
  label: string;
  meta: string;
  href: string;
};
```

Изменить `CatalogFilters.sort` на `CatalogSort`.

- [ ] **Step 4: Реализовать pure URL helpers**

В `src/lib/catalog-query.ts` экспортировать `CATALOG_PAGE_SIZE = 24`, `parseCatalogQuery()` и:

```ts
type CatalogHrefPatch = {
  q?: string;
  category?: string;
  brand?: string;
  spec?: string;
  availability?: "pickup";
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
  page?: number;
  toggle?: "brand" | "spec";
  resetFilters?: boolean;
};

export function buildCatalogHref(
  pathname: string,
  current: URLSearchParams,
  patch: CatalogHrefPatch,
): string;
```

Реализация должна стабильно сериализовать ключи в порядке `q`, `category`, `brand`, `availability`, `minPrice`, `maxPrice`, `spec`, `sort`, `page`; удалять пустые значения; считать default sort как `relevance` при непустом `q` и `featured` при пустом; удалять `page` при любом patch, кроме явного `{ page }`.

- [ ] **Step 5: Запустить tests и quality gate**

```powershell
pnpm exec vitest run src/lib/catalog-query.test.ts
pnpm exec eslint src/lib/catalog-query.ts src/lib/catalog-query.test.ts src/lib/types.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/catalog-query.ts src/lib/catalog-query.test.ts src/lib/types.ts
git commit -m "feat: define catalog search query contract"
```

### Task 2: Исправить и усилить Supabase search RPC

**Files:**

- Create via CLI: exact migration path printed by `pnpm dlx supabase migration new public_search_products_rpc_contract`
- Create: `src/lib/supabase-search-contract.test.ts`
- Modify after local migration: `src/lib/supabase/database.types.ts`

**Interfaces:**

- Preserves database identity: `public.search_products(text, text, jsonb, text, integer) returns jsonb`.
- Produces JSON matching `CatalogSearchResult` except `source`, which repository adds.
- Preserves `public.search_suggestions(text)` identity.

- [ ] **Step 1: Проверить CLI и migration history**

```powershell
pnpm dlx supabase --version
pnpm dlx supabase migration --help
pnpm dlx supabase db reset --help
pnpm dlx supabase db lint --help
pnpm dlx supabase db push --help
pnpm dlx supabase gen types --help
pnpm dlx supabase migration list
```

Expected: CLI responds and existing local/remote migration history is visible. Do not continue against a linked project whose ref is not the intended project.

- [ ] **Step 2: Создать миграцию только через CLI**

```powershell
pnpm dlx supabase migration new public_search_products_rpc_contract
```

Record the exact generated path from stdout and use only that file for the SQL below.

- [ ] **Step 3: Добавить failing static contract tests**

Создать `src/lib/supabase-search-contract.test.ts`, найти migration по suffix `public_search_products_rpc_contract.sql` через `readdirSync("supabase/migrations")` и проверить наличие:

```ts
expect(sql).toContain("security invoker");
expect(sql).toContain("left join public.categories");
expect(sql).toContain("p.category_id is null or c.is_active");
expect(sql).toContain("from public, anon, authenticated");
expect(sql).toContain("to anon, authenticated");
expect(sql).not.toContain("to_jsonb(p)");
expect(sql).not.toContain("p.*");
```

Run:

```powershell
pnpm exec vitest run src/lib/supabase-search-contract.test.ts
```

Expected: FAIL until the generated migration contains the new function body.

- [ ] **Step 4: Заменить RPC с сохранением сигнатуры**

В generated migration использовать `create or replace function` с явными validation CTEs и allow-list JSON. Обязательная структура:

```sql
create or replace function public.search_products(
  search_query text default '',
  category_slug text default null,
  filter_values jsonb default '{}'::jsonb,
  sort_order text default 'relevance',
  page_number integer default 1
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select
      trim(coalesce(search_query, '')) as q,
      case when sort_order in ('relevance', 'featured', 'price-asc', 'price-desc', 'name')
        then sort_order else 'relevance' end as safe_sort,
      greatest(coalesce(page_number, 1), 1) as safe_page,
      case when jsonb_typeof(coalesce(filter_values, '{}'::jsonb)) = 'object'
        then coalesce(filter_values, '{}'::jsonb) else '{}'::jsonb end as filters
  ),
  matched as materialized (
    select
      p.id,
      p.slug,
      p.category_id,
      p.sku,
      p.brand,
      p.name_de,
      p.short_description_de,
      p.description_de,
      p.price_gross,
      p.sale_unit,
      p.base_price,
      p.base_unit,
      p.base_quantity,
      p.coverage_per_unit,
      p.weight_kg,
      p.primary_image_url,
      p.specs,
      p.search_aliases,
      p.variant_group,
      p.variant_label,
      p.is_featured,
      c.id as category_id_value,
      c.slug as category_slug_value,
      c.name_de as category_name,
      c.description_de as category_description,
      ts_rank(p.search_document, websearch_to_tsquery('german', input.q))
        + extensions.similarity(lower(p.name_de), lower(input.q)) as score
    from public.products p
    left join public.categories c on c.id = p.category_id
    cross join input
    where p.is_active
      and (p.category_id is null or c.is_active)
      and (category_slug is null or c.slug = category_slug)
      and (
        input.q = ''
        or p.search_document @@ websearch_to_tsquery('german', input.q)
        or extensions.similarity(lower(p.name_de), lower(input.q)) > 0.25
        or lower(coalesce(c.name_de, '') || ' ' || coalesce(c.description_de, ''))
          like '%' || lower(input.q) || '%'
        or exists (
          select 1 from unnest(p.search_aliases) alias
          where extensions.similarity(lower(alias), lower(input.q)) > 0.25
        )
        or exists (
          select 1 from jsonb_each_text(p.specs) spec
          where lower(spec.value) like '%' || lower(input.q) || '%'
        )
        or lower(p.sku) = lower(input.q)
      )
      and (
        not (input.filters ? 'brands')
        or (
          jsonb_typeof(input.filters -> 'brands') = 'array'
          and p.brand in (select jsonb_array_elements_text(input.filters -> 'brands'))
        )
      )
      and (
        not (input.filters ? 'minPrice')
        or (
          jsonb_typeof(input.filters -> 'minPrice') = 'number'
          and p.price_gross >= (input.filters ->> 'minPrice')::numeric
        )
      )
      and (
        not (input.filters ? 'maxPrice')
        or (
          jsonb_typeof(input.filters -> 'maxPrice') = 'number'
          and p.price_gross <= (input.filters ->> 'maxPrice')::numeric
        )
      )
      and (
        coalesce(input.filters ->> 'availability', '') = ''
        or (
          input.filters ->> 'availability' = 'pickup'
          and exists (
            select 1
            from public.inventory available_inventory
            join public.locations available_location
              on available_location.id = available_inventory.location_id
            where available_inventory.product_id = p.id
              and available_inventory.available_qty > 0
              and available_inventory.pickup_available
              and available_location.is_active
              and available_location.slug = 'baumarkt-nassauer-land'
          )
        )
      )
      and (
        not (input.filters ? 'specs')
        or (
          jsonb_typeof(input.filters -> 'specs') = 'object'
          and not exists (
            select 1
            from jsonb_each(input.filters -> 'specs') facet
            where jsonb_typeof(facet.value) <> 'array'
              or not exists (
                select 1
                from jsonb_array_elements_text(facet.value) selected
                where selected = p.specs ->> facet.key
              )
          )
        )
      )
  ),
  ordered as (
    select matched.*,
      row_number() over (
        order by
          case when (select safe_sort from input) = 'price-asc' then price_gross end asc,
          case when (select safe_sort from input) = 'price-desc' then price_gross end desc,
          case when (select safe_sort from input) = 'name' then name_de end asc,
          case when (select safe_sort from input) = 'relevance' then score end desc,
          is_featured desc,
          name_de asc,
          id asc
      ) as result_position
    from matched
  ),
  paged as (
    select * from ordered
    where result_position > (((select safe_page from input) - 1) * 24)
      and result_position <= ((select safe_page from input) * 24)
  ),
  category_facets as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', grouped.category_id_value,
      'slug', grouped.category_slug_value,
      'name', grouped.category_name,
      'shortName', split_part(grouped.category_name, ' & ', 1),
      'description', grouped.category_description,
      'count', grouped.product_count
    ) order by grouped.category_name), '[]'::jsonb) as value
    from (
      select
        category_id_value,
        category_slug_value,
        category_name,
        category_description,
        count(*)::integer as product_count
      from matched
      where category_id_value is not null
      group by category_id_value, category_slug_value, category_name, category_description
    ) grouped
  ),
  brand_facets as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'value', grouped.brand,
      'count', grouped.product_count
    ) order by grouped.brand), '[]'::jsonb) as value
    from (
      select brand, count(*)::integer as product_count
      from matched
      group by brand
    ) grouped
  ),
  spec_facets as (
    select coalesce(jsonb_object_agg(grouped.spec_key, grouped.spec_values), '{}'::jsonb) as value
    from (
      select spec_key, jsonb_agg(jsonb_build_object(
        'value', spec_value,
        'count', product_count
      ) order by spec_value) as spec_values
      from (
        select spec.key as spec_key, spec.value as spec_value, count(*)::integer as product_count
        from matched
        cross join lateral jsonb_each_text(matched.specs) spec
        group by spec.key, spec.value
      ) counted
      group by spec_key
    ) grouped
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'categorySlug', p.category_slug_value,
      'sku', p.sku,
      'brand', p.brand,
      'name', p.name_de,
      'shortDescription', p.short_description_de,
      'description', p.description_de,
      'price', p.price_gross,
      'saleUnit', p.sale_unit,
      'basePrice', p.base_price,
      'baseUnit', p.base_unit,
      'baseQuantity', p.base_quantity,
      'coveragePerUnit', p.coverage_per_unit,
      'weightKg', p.weight_kg,
      'image', coalesce(p.primary_image_url, '/og.png'),
      'imageAlt', p.name_de || ' – Produktabbildung',
      'featured', p.is_featured,
      'aliases', p.search_aliases,
      'specs', p.specs,
      'inventory', jsonb_build_object(
        'berlin', coalesce(inv.available_qty, 0),
        'pickup', coalesce(inv.pickup_available, false),
        'pickupLeadTime', coalesce(inv.lead_time_de, 'Abholung auf Anfrage')
      ),
      'variantGroup', p.variant_group,
      'variantLabel', p.variant_label
    ) order by p.result_position)
    from paged p
    left join lateral (
      select i.available_qty, i.pickup_available, i.lead_time_de
      from public.inventory i
      join public.locations l on l.id = i.location_id
      where i.product_id = p.id
        and l.is_active
        and l.slug = 'baumarkt-nassauer-land'
      limit 1
    ) inv on true), '[]'::jsonb),
    'total', (select count(*) from matched),
    'page', (select safe_page from input),
    'pageSize', 24,
    'pageCount', ceil((select count(*) from matched) / 24.0)::integer,
    'hasPreviousPage', (select safe_page from input) > 1,
    'hasNextPage', (select safe_page from input) * 24 < (select count(*) from matched),
    'facets', jsonb_build_object(
      'categories', (select value from category_facets),
      'brands', (select value from brand_facets),
      'minPrice', (select min(price_gross) from matched),
      'maxPrice', (select max(price_gross) from matched),
      'specs', (select value from spec_facets)
    )
  );
$$;
```

- [ ] **Step 5: Исправить suggestions и public visibility**

В той же migration переопределить `search_suggestions(text)` так, чтобы product branch использовал `left join categories`, условие `(p.category_id is null or c.is_active)`, allow-list и детерминированный порядок. Category suggestion href остаётся `/kategorie/{slug}`; query будет добавлен UI в Task 7.

Изменить policy `products_public_read` так, чтобы обычные `anon`/`authenticated` видели:

```sql
is_active
and (
  category_id is null
  or exists (
    select 1 from public.categories c
    where c.id = category_id and c.is_active
  )
)
or (select private.is_admin())
```

- [ ] **Step 6: Закрепить grants**

```sql
revoke execute on function public.search_products(text, text, jsonb, text, integer)
from public, anon, authenticated;
grant execute on function public.search_products(text, text, jsonb, text, integer)
to anon, authenticated;

revoke execute on function public.search_suggestions(text)
from public, anon, authenticated;
grant execute on function public.search_suggestions(text)
to anon, authenticated;
```

- [ ] **Step 7: Локальная DB-верификация**

```powershell
pnpm dlx supabase db reset --local
pnpm dlx supabase db lint --local
pnpm dlx supabase migration list
pnpm exec vitest run src/lib/supabase-search-contract.test.ts src/lib/supabase-permissions.test.ts
```

SQL smoke cases: empty query, exact SKU, alias, typo, inactive product, inactive category, uncategorized product, Nassau pickup, brand/price/spec combinations, page after last page, stable repeated page calls.

- [ ] **Step 8: Проверить plan до добавления индексов**

Run `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` для `platte`, exact SKU и pickup filter. Добавлять кандидаты `lower(sku) where is_active`, category-name trigram или inventory partial index только если план показывает scan/rows-removed проблему; каждое добавление повторно проверить `EXPLAIN`.

- [ ] **Step 9: Регенерировать типы из локальной схемы**

```powershell
pnpm dlx supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
pnpm exec tsc --noEmit
```

Не заменять `Returns: Json` вручную структурным типом.

- [ ] **Step 10: Commit**

Stage только generated migration, contract test и regenerated types:

```powershell
git add supabase/migrations src/lib/supabase-search-contract.test.ts src/lib/supabase/database.types.ts
git diff --cached --name-only
git commit -m "feat: harden storefront search RPC"
```

### Task 3: Реализовать server-side search repository и demo parity

**Files:**

- Create: `src/lib/catalog-search.ts`
- Create: `src/lib/catalog-search.test.ts`
- Modify: `src/lib/catalog.ts:47`
- Modify: `src/lib/catalog-repository.ts:62`

**Interfaces:**

- Consumes: `CatalogQuery`, `CatalogSearchResult`, Supabase `search_products` JSON.
- Produces: `searchCatalog(query: CatalogQuery, categoryScope?: string): Promise<CatalogSearchResult>`.
- Produces fallback: `searchCatalogLocally(products, categories, query, categoryScope): CatalogSearchResult`.

- [ ] **Step 1: Добавить failing tests repository-контракта**

В `src/lib/catalog-search.test.ts` проверить:

```ts
it("keeps uncategorized products globally but excludes them from category scope", () => {
  const global = searchCatalogLocally(products, categories, parseCatalogQuery({ q: "Produkt" }));
  const scoped = searchCatalogLocally(
    products,
    categories,
    parseCatalogQuery({ q: "Produkt" }),
    "trockenbau-platten",
  );

  expect(global.items.some((item) => item.categorySlug === null)).toBe(true);
  expect(scoped.items.every((item) => item.categorySlug === "trockenbau-platten")).toBe(true);
});

it("returns total independently from the current page slice", () => {
  const result = searchCatalogLocally(
    Array.from({ length: 30 }, (_, index) => ({ ...products[0], id: String(index) })),
    categories,
    parseCatalogQuery({ page: "2" }),
  );

  expect(result.total).toBe(30);
  expect(result.items).toHaveLength(6);
  expect(result.pageCount).toBe(2);
});
```

- [ ] **Step 2: Запустить tests и подтвердить RED**

```powershell
pnpm exec vitest run src/lib/catalog-search.test.ts
```

- [ ] **Step 3: Унифицировать searchable document fallback**

В `searchProducts()` включить `shortDescription`, `description`, `category.name`, `category.shortName`, `category.description`, aliases и specs. Exact SKU получает максимальный boost; full normalized product name — следующий; совпадение всех терминов выше совпадения одного; typo distance применяется только после отсутствия точных token matches.

Admin search и fallback suggestions продолжают вызывать этот helper, поэтому получают те же поля без отдельной реализации.

- [ ] **Step 4: Реализовать local result/facets/pagination**

`searchCatalogLocally()` должен:

1. применить text/category/filter pipeline;
2. вычислить `total` до `slice`;
3. вычислить facets из matched set;
4. применить deterministic sort с final `id.localeCompare()`;
5. взять `slice((page - 1) * 24, page * 24)`;
6. вызвать `findSearchCorrection()` только при непустом `q` и `total === 0`;
7. вернуть `source: "demo"` и optional `correction`.

Для category hits использовать `filterCategories(query.q, categories)` и count продуктов matched только text query + category slug до выбранного category filter.

- [ ] **Step 5: Реализовать Zod validation RPC JSON**

В `catalog-search.ts` создать `catalogSearchPayloadSchema`, явно описывающую `Product`, facets, pagination и nullable fields без application-only поля `source`. После `parse()` добавить `source: "supabase"`; `correction` для RPC отсутствует, поскольку FTS/trigram уже возвращает typo-tolerant results. `searchCatalog()` вызывает:

```ts
const { data, error } = await supabase.rpc("search_products", {
  search_query: query.q,
  category_slug: categoryScope ?? query.category ?? null,
  filter_values: {
    brands: query.brands,
    availability: query.availability,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    specs: query.specs,
  },
  sort_order: query.sort,
  page_number: query.page,
});
```

При отсутствии configured public client использовать demo fallback. При RPC error или invalid JSON логировать server-side diagnostic и использовать demo fallback только в development/demo configuration; в production возвращать контролируемую ошибку страницы, чтобы реальные ошибки базы не маскировались фиктивным каталогом.

- [ ] **Step 6: Отделить categories от full catalog repository**

Добавить cached `getPublicCategories()` с запросом только categories. Сохранить `getCatalogData()` для admin/demo и не менять `getAdminCatalogData()`. Публичные route pages после Task 5 не должны вызывать полный `.from("products").select(...)`.

- [ ] **Step 7: Запустить focused tests**

```powershell
pnpm exec vitest run src/lib/catalog.test.ts src/lib/catalog-search.test.ts src/lib/catalog-repository.test.ts src/lib/admin-product-search.test.ts
pnpm exec eslint src/lib/catalog.ts src/lib/catalog-search.ts src/lib/catalog-search.test.ts src/lib/catalog-repository.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/catalog.ts src/lib/catalog-search.ts src/lib/catalog-search.test.ts src/lib/catalog-repository.ts
git commit -m "feat: add server-side catalog search repository"
```

### Task 4: Превратить CatalogView в server-results presentation shell

**Files:**

- Modify: `src/components/catalog-view.tsx`
- Modify: `src/components/catalog-filter-panel.tsx`
- Create: `src/components/catalog-pagination.tsx`
- Create: `src/components/catalog-empty-state.tsx`
- Modify: `src/app/styles/catalog.css`
- Modify: `src/app/styles/responsive.css`

**Interfaces:**

- Consumes `CatalogViewProps = { pathname; query; result; categories; activeCategory? }`.
- `CatalogFilterPanel` consumes `CatalogFacets`; it no longer counts values from `initialProducts`.
- URL mutations use `buildCatalogHref()` and trigger Server Component navigation.

- [ ] **Step 1: Добавить pure pagination href tests**

Расширить `catalog-query.test.ts`: page 1 omitted, page 2 preserves all filters, changing brand removes page.

- [ ] **Step 2: Изменить CatalogView props и удалить client filtering**

Использовать:

```ts
type CatalogViewProps = {
  pathname: string;
  query: CatalogQuery;
  result: CatalogSearchResult;
  categories: Category[];
  activeCategory?: string;
};
```

Удалить `initialQuery`, `initialProducts`, `filterProducts`, `getCategoryProducts`, `getBrands` и `useMemo` поиска. Render grid строго из `result.items`, toolbar count из `result.total`, filters из `result.facets`.

- [ ] **Step 3: Централизовать URL actions**

`setParam` строит URL через `buildCatalogHref(pathname, params, patch)`. Search clear передаёт `{ q: undefined }`; reset — `{ resetFilters: true }`; category/brand/spec/availability/price/sort передают соответствующий patch. Не использовать fallback `params.get("q") ?? initialQuery`.

- [ ] **Step 4: Перевести filter counts на server facets**

`CatalogFilterPanel` принимает `CatalogFacets`. Category, brand и spec labels используют `{ value, count }`; выбранные значения остаются видимыми даже при count 0, чтобы пользователь мог снять фильтр. Price inputs получают validated query values.

- [ ] **Step 5: Создать доступную pagination**

`CatalogPagination` принимает `pathname`, `query`, `page`, `pageCount`; использует `<nav aria-label="Suchergebnisseiten">`, `aria-current="page"`, labels `Vorherige Seite` и `Nächste Seite`. Не рендерить при `pageCount <= 1`.

- [ ] **Step 6: Создать контекстный empty state**

`CatalogEmptyState` различает:

- query only: `Keine Produkte für „…“ gefunden` + clear-q action;
- filters: `Keine Produkte mit diesen Filtern gefunden` + reset-filters action;
- query + filters: обе независимые actions.

Каждая action строит URL helper и сохраняет несбрасываемое состояние согласно Global Constraints.

- [ ] **Step 7: Обновить CSS**

Добавить `.catalog-pagination`, `.catalog-empty-actions`, disabled/active page states и mobile wrapping. Сохранить существующие tokens/colors/focus styles; не менять unrelated selectors.

- [ ] **Step 8: Проверить task**

```powershell
pnpm exec vitest run src/lib/catalog-query.test.ts
pnpm exec eslint src/components/catalog-view.tsx src/components/catalog-filter-panel.tsx src/components/catalog-pagination.tsx src/components/catalog-empty-state.tsx
pnpm format:check
```

- [ ] **Step 9: Commit**

```powershell
git add src/components/catalog-view.tsx src/components/catalog-filter-panel.tsx src/components/catalog-pagination.tsx src/components/catalog-empty-state.tsx src/app/styles/catalog.css src/app/styles/responsive.css src/lib/catalog-query.test.ts
git commit -m "feat: render server-backed catalog results"
```

### Task 5: Подключить единый Server Component flow к трём страницам

**Files:**

- Modify: `src/app/suche/page.tsx`
- Modify: `src/app/sortiment/page.tsx`
- Modify: `src/app/kategorie/[slug]/page.tsx`
- Create: `src/components/catalog-category-results.tsx`
- Modify: `src/app/styles/catalog.css`

**Interfaces:**

- Each page consumes `searchParams: Promise<CatalogSearchParams>`.
- Calls `parseCatalogQuery()`, `getPublicCategories()`, `searchCatalog()`.
- Produces one authoritative `result.total` for hero, toolbar and pagination.

- [ ] **Step 1: Создать category results component**

`CatalogCategoryResults` принимает `{ hits: CategorySearchHit[]; query: CatalogQuery }`. При непустом `q` рендерит heading `Passende Kategorien`; каждая ссылка ведёт на `/kategorie/${slug}?q=${encodedQuery}` и показывает `${count} Produkte`. При отсутствии hits рендерит нейтральный текст, не скрывая товары.

- [ ] **Step 2: Перевести `/suche` на server search**

Страница:

```ts
const rawParams = await searchParams;
const query = parseCatalogQuery(rawParams);
const [categories, result] = await Promise.all([getPublicCategories(), searchCatalog(query)]);
```

Hero и toolbar используют `result.total`. Блок `Meinten Sie` рендерится только когда `result.correction` определён локальным demo-fallback; production RPC не загружает весь каталог ради отдельного correction pass.

- [ ] **Step 3: Перевести `/sortiment`**

Добавить typed async `searchParams`, удалить hardcoded `24 PRODUKTE · 6 KATEGORIEN`, использовать `${result.total} PRODUKTE · ${categories.length} KATEGORIEN`. При `q` показывать `CatalogCategoryResults`; при пустом q список категорий остаётся в filter panel.

- [ ] **Step 4: Перевести `/kategorie/[slug]`**

Параллельно await `params`/`searchParams`, проверить category, затем вызвать `searchCatalog(query, slug)`. Не загружать и не фильтровать полный products array. Не показывать global category results. Игнорировать query `category`.

- [ ] **Step 5: Согласовать JSON-LD**

`numberOfItems` использует `result.total`; `itemListElement` содержит только текущую страницу, а `position` равен `(result.page - 1) * result.pageSize + index + 1`.

- [ ] **Step 6: Проверить Next.js contracts**

Убедиться, что `params` и `searchParams` типизированы как `Promise`, `useSearchParams()` остаётся внутри существующего Suspense boundary, а server reads не делают внутренний HTTP round-trip через route handler.

- [ ] **Step 7: Запустить route checks**

```powershell
pnpm exec eslint src/app/suche/page.tsx src/app/sortiment/page.tsx 'src/app/kategorie/[slug]/page.tsx' src/components/catalog-category-results.tsx
pnpm exec tsc --noEmit
pnpm build
```

Expected: all three routes build without CSR bailout or non-serializable prop errors.

- [ ] **Step 8: Commit**

```powershell
git add src/app/suche/page.tsx src/app/sortiment/page.tsx 'src/app/kategorie/[slug]/page.tsx' src/components/catalog-category-results.tsx src/app/styles/catalog.css
git commit -m "feat: connect catalog pages to server search"
```

### Task 6: Довести category/filter/no-results UX до e-commerce сценариев

**Files:**

- Modify: `src/components/catalog-view.tsx`
- Modify: `src/components/catalog-filter-panel.tsx`
- Modify: `src/components/catalog-category-results.tsx`
- Modify: `src/components/catalog-empty-state.tsx`
- Modify: `src/app/styles/catalog.css`

**Interfaces:**

- Category hits come only from `result.facets.categories`.
- Active URL values remain removable even when absent from current facets.

- [ ] **Step 1: Добавить default sort behavior**

При непустом query dropdown показывает `Relevanz` как default; при пустом query — `Empfehlung`. Оба option доступны явно, но default value не сериализуется.

- [ ] **Step 2: Сохранить selected filters при zero counts**

Объединить server facet values с active brands/specs перед render. Active value с count 0 отображать последним и не считать доступным для нового выбора.

- [ ] **Step 3: Добавить result context copy**

Toolbar отображает `1 Produkt` или `${n} Produkte`; category result count использует ту же pluralization. Page-out-of-range возвращает empty page и ссылку на последнюю допустимую страницу без silent redirect loop.

- [ ] **Step 4: Проверить URL matrix вручную на pure helpers**

Добавить table-driven tests для:

```text
/suche?q=platte&brand=Knauf&page=2 -> clear q -> /suche?brand=Knauf
/suche?q=platte&category=trockenbau-platten&brand=Knauf -> reset -> /suche?q=platte
/sortiment?q=dämm -> category hit -> /kategorie/daemmung-folien?q=d%C3%A4mm
/kategorie/trockenbau-platten?q=platte&category=holz-bauplatten -> scope remains trockenbau-platten
```

- [ ] **Step 5: Run focused checks**

```powershell
pnpm exec vitest run src/lib/catalog-query.test.ts src/lib/catalog-search.test.ts
pnpm exec eslint src/components/catalog-view.tsx src/components/catalog-filter-panel.tsx src/components/catalog-category-results.tsx src/components/catalog-empty-state.tsx
```

- [ ] **Step 6: Commit**

```powershell
git add src/components/catalog-view.tsx src/components/catalog-filter-panel.tsx src/components/catalog-category-results.tsx src/components/catalog-empty-state.tsx src/app/styles/catalog.css src/lib/catalog-query.test.ts src/lib/catalog-search.test.ts
git commit -m "feat: refine catalog search result states"
```

### Task 7: Сделать global autocomplete доступным и сохранить search context

**Files:**

- Modify: `src/components/search-autocomplete.tsx`
- Modify: `src/app/api/suggestions/route.ts`
- Create: `src/lib/search-autocomplete.test.ts`
- Modify: `src/app/styles/header-interactions.css`

**Interfaces:**

- Uses shared `SearchSuggestion`.
- Category href is augmented to `/kategorie/{slug}?q={currentQuery}` in UI.
- API always returns `{ items: SearchSuggestion[] }`.

- [ ] **Step 1: Вынести testable keyboard reducer**

В `search-autocomplete.tsx` или small adjacent helper экспортировать pure transition:

```ts
type AutocompleteKey = "ArrowDown" | "ArrowUp" | "Escape";

export function nextAutocompleteIndex(
  current: number,
  itemCount: number,
  key: AutocompleteKey,
): number;
```

Тесты: `-1 -> 0` ArrowDown, wrap last -> 0, `-1 -> last` ArrowUp, Escape -> `-1`, empty list always `-1`.

- [ ] **Step 2: Исправить stale/empty request state**

При query длиной меньше 2 сразу `setItems([])`, `setLoading(false)`, `setActiveIndex(-1)`. Каждому fetch присвоить monotonically increasing request id; применять response только если id соответствует последнему запросу. AbortError игнорировать, остальные ошибки переводить в non-blocking `aria-live` status.

- [ ] **Step 3: Реализовать combobox semantics**

Input получает `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls="global-search-suggestions"`, `aria-activedescendant`. Container получает `role="listbox"`; каждая ссылка — `role="option"`, stable id и `aria-selected`.

- [ ] **Step 4: Реализовать keyboard navigation**

ArrowDown/ArrowUp меняют active option; Enter при active option вызывает router navigation; Enter без active option отправляет `/suche?q=...`; Escape закрывает; clear очищает items и возвращает focus в input.

- [ ] **Step 5: Сохранить q при category suggestion**

Для `item.type === "category"` добавлять текущий query к href через `URLSearchParams`, получая `/kategorie/{slug}?q=...`. Product href не менять.

- [ ] **Step 6: Усилить API route**

Trim query, ограничить длину до 120 символов, вернуть 400 для более длинного запроса, проверить RPC rows через Zod-схему `z.array(searchSuggestionSchema)` с полями shared `SearchSuggestion`, сохранить `Cache-Control`, а при configured Supabase RPC error вернуть controlled 502 вместо silent demo data in production. Demo fallback остаётся для отсутствующей конфигурации.

- [ ] **Step 7: Проверить tests/lint**

```powershell
pnpm exec vitest run src/lib/search-autocomplete.test.ts
pnpm exec eslint src/components/search-autocomplete.tsx src/app/api/suggestions/route.ts src/lib/search-autocomplete.test.ts
```

- [ ] **Step 8: Commit**

```powershell
git add src/components/search-autocomplete.tsx src/app/api/suggestions/route.ts src/lib/search-autocomplete.test.ts src/app/styles/header-interactions.css
git commit -m "feat: make search autocomplete accessible"
```

### Task 8: End-to-end verification, performance gate и документация

**Files:**

- Modify only if verification reveals an in-scope defect.
- Update: `docs/superpowers/specs/2026-08-15-catalog-scoped-search-design.md`
- Update: `docs/superpowers/specs/2026-08-15-search-category-filters-design.md`

**Interfaces:**

- Verifies the full path: browser URL → Server Component → RPC/RLS → mapped result → filters/pagination/autocomplete.

- [ ] **Step 1: Запустить весь static/test suite**

```powershell
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm format:check
pnpm check:size
pnpm build
```

Expected: every command exits 0. Do not run `pnpm format` over the dirty worktree.

- [ ] **Step 2: Запустить local Supabase verification**

```powershell
pnpm dlx supabase db reset --local
pnpm dlx supabase db lint --local
pnpm dlx supabase migration list
```

Run SQL checks for function volatility/security, function grants, RLS enabled, inactive category exclusion, uncategorized inclusion and Nassau pickup behavior.

- [ ] **Step 3: Проверить query plans**

Run `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` for empty catalog, `platte`, exact SKU, typo and pickup+brand+spec. Record execution time, rows, buffers and used indexes in the implementation handoff. Do not add speculative indexes when the existing GIN/trigram/category/inventory indexes produce acceptable plans.

- [ ] **Step 4: Browser verification `/suche`**

Verify:

1. `/suche?q=platte` hero count equals toolbar total.
2. Category, brand, price, pickup, spec and sort preserve `q`.
3. Page 2 preserves all state.
4. Clear q from `/suche?q=platte&brand=Knauf&page=2` yields `/suche?brand=Knauf`.
5. Reset filters yields `/suche?q=platte`.
6. Query-only, filters-only and combined zero-results show correct independent actions.

- [ ] **Step 5: Browser verification catalog/category**

Verify `/sortiment?q=dämm` shows category hits and category link preserves q. Verify `/kategorie/trockenbau-platten?q=platte&brand=Knauf` never shows another category, ignores injected `category=holz-bauplatten`, and clearing q preserves brand.

- [ ] **Step 6: Browser verification autocomplete/a11y/mobile**

At desktop and 390px viewport verify debounce, loading, empty state, ArrowUp/Down, Enter, Escape, focus return, product link, category link with q, screen-reader attributes, mobile drawer and pagination wrapping.

- [ ] **Step 7: Проверить production migration без применения**

Only after confirming the intended linked project:

```powershell
pnpm dlx supabase db push --dry-run
```

Review exact SQL. Do not run linked `db push` as part of implementation unless the user separately authorizes deployment.

- [ ] **Step 8: Обновить specs**

В двух existing specs заменить прежнее ограничение “без RPC/миграции” на фактическую server-search архитектуру, добавить `page`, category hits, URL clear/reset rules, inactive/uncategorized visibility и verification matrix. Не создавать третий конфликтующий design document.

- [ ] **Step 9: Final diff audit**

```powershell
git diff --check
git status --short
git log --oneline -8
```

Сопоставить каждый changed file с одной задачей этого плана. Убедиться, что account/order/user changes не попали в search commits.

- [ ] **Step 10: Commit docs/verification fixes**

```powershell
git add docs/superpowers/specs/2026-08-15-catalog-scoped-search-design.md docs/superpowers/specs/2026-08-15-search-category-filters-design.md
git commit -m "docs: align search specs with server architecture"
```

## Explicitly Deferred

- Search analytics, popular queries, click-through/conversion tracking and merchandising rules.
- Personalized ranking and sponsored products.
- External search engines such as Algolia, Elasticsearch or Meilisearch.
- Cursor pagination; fixed 24-row offset pagination is sufficient for the current catalog and can be replaced behind `searchCatalog()` later.
- Self-excluding facets; current facets reflect the fully matched set and this behavior must be documented.
- Automatic redirect on exact category match.

## Reference Material

- Supabase Full Text Search: https://supabase.com/docs/guides/database/full-text-search
- Supabase JavaScript RPC: https://supabase.com/docs/reference/javascript/rpc
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase CLI workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Next.js local docs: `node_modules/next/dist/docs/`
