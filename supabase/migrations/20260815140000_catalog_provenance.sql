-- Keep a traceable supplier/manufacturer reference for every store-managed SKU.
alter table public.products
  add column if not exists gtin text,
  add column if not exists source_url text,
  add column if not exists last_synced_at timestamptz;

create unique index if not exists products_gtin_unique_idx
  on public.products (gtin)
  where gtin is not null;
