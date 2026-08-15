# Admin product search design

## Goal

Add a product search field to `/admin/produkte`, next to the existing list/grid
switcher, so administrators can quickly narrow the visible catalog without
leaving the page.

## Scope

- Search is client-side and updates as the user types.
- Search matches product name, brand, SKU, aliases, category name, and product
  specification values through the existing catalog search behavior.
- German diacritics and case differences remain normalized by the existing
  `normalizeSearch`/`searchProducts` helpers.
- The current list/grid view, product links, status controls, and admin-only
  write permissions remain unchanged.
- Empty input shows the full catalog.
- A non-empty query with no matches shows a concise empty state with a way to
  clear the query.
- The search control is keyboard accessible, labeled in German, and remains
  usable on the existing mobile layout.

## Architecture and data flow

`src/app/admin/produkte/page.tsx` continues to fetch the catalog on the server
and passes `products` to the existing client component. The client component
owns only the transient query state, calls the shared `searchProducts` helper,
and renders the filtered array in either existing view mode. No database query,
API route, URL parameter, or persistent state is added.

The search control will be placed in the product browser controls above the
results. A result count makes the effect of the query explicit. Search uses the
same product ordering returned by the helper and does not mutate the original
server-provided array.

## Error and empty states

Search is a synchronous in-memory operation and has no network or validation
errors. Whitespace-only input behaves like an empty query. When there are no
matches, the catalog surface remains in the selected view mode and displays
`Keine Produkte gefunden` plus a clear-search button.

## Testing and verification

- Add a focused unit test proving admin search finds a product by SKU and
  returns no unrelated products for a non-matching query.
- Run the test suite and lint/type-aware checks.
- Run a production build.
- Verify the page in the open local browser at desktop and narrow/mobile widths:
  input visibility, filtering, clear action, no-result state, and preservation
  of list/grid switching.

## Alternatives considered

1. **Server-side URL search** — supports shareable result URLs and scales to
   larger datasets, but adds request/URL state and is unnecessary for the
   already-loaded admin catalog.
2. **Autocomplete-only search** — helps jump to a specific product, but does
   not provide the requested catalog filtering experience.
3. **Client-side filtering in the existing catalog (chosen)** — immediate,
   minimal, reuses tested search logic, and fits the current component boundary.
