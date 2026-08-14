create extension if not exists pg_trgm with schema extensions;

create type public.profile_role as enum ('customer', 'admin');
create type public.request_status as enum ('new', 'processing', 'quoted', 'completed', 'cancelled');
create type public.fulfillment_type as enum ('pickup', 'delivery');

create sequence public.request_number_seq start 1;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.profile_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_de text not null,
  description_de text not null default '',
  image_path text,
  sort_order integer not null default 0,
  filter_config jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  sku text not null unique,
  slug text not null unique,
  brand text not null,
  name_de text not null,
  short_description_de text not null default '',
  description_de text not null default '',
  price_gross numeric(12, 2) not null check (price_gross >= 0),
  vat_rate numeric(5, 2) not null default 19,
  sale_unit text not null,
  base_price numeric(12, 2) not null check (base_price >= 0),
  base_unit text not null,
  base_quantity numeric(12, 3) not null default 1 check (base_quantity > 0),
  coverage_per_unit numeric(12, 3),
  weight_kg numeric(12, 3) not null default 0,
  primary_image_url text,
  specs jsonb not null default '{}'::jsonb,
  search_aliases text[] not null default '{}',
  variant_group text,
  variant_label text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  search_document tsvector generated always as (
    setweight(to_tsvector('german', coalesce(name_de, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(sku, '') || ' ' || coalesce(brand, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(short_description_de, '') || ' ' || coalesce(description_de, '') || ' ' || array_to_string(search_aliases, ' ')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_de text not null,
  sort_order integer not null default 0,
  unique (product_id, storage_path)
);

create table public.product_variant_links (
  product_id uuid not null references public.products (id) on delete cascade,
  sibling_product_id uuid not null references public.products (id) on delete cascade,
  label_de text not null,
  primary key (product_id, sibling_product_id),
  check (product_id <> sibling_product_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_de text not null,
  location_type text not null check (location_type in ('store', 'warehouse')),
  address_de text,
  is_active boolean not null default true
);

create table public.inventory (
  product_id uuid not null references public.products (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  available_qty numeric(12, 3) not null default 0 check (available_qty >= 0),
  pickup_available boolean not null default false,
  delivery_available boolean not null default false,
  lead_time_de text not null default '',
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  postal_code text not null check (postal_code ~ '^\d{5}$'),
  fulfillment public.fulfillment_type not null,
  comment text not null default '',
  status public.request_status not null default 'new',
  currency char(3) not null default 'EUR',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku_snapshot text not null,
  name_snapshot text not null,
  sale_unit_snapshot text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);

create index products_category_idx on public.products (category_id);
create index products_active_idx on public.products (category_id, is_featured) where is_active;
create index products_search_idx on public.products using gin (search_document);
create index products_name_trgm_idx on public.products using gin (lower(name_de) extensions.gin_trgm_ops);
create index products_specs_idx on public.products using gin (specs);
create index inventory_location_idx on public.inventory (location_id, available_qty);
create index requests_user_idx on public.requests (user_id, created_at desc);
create index requests_status_idx on public.requests (status, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone', 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.search_products(search_query text)
returns setof public.products
language sql
stable
as $$
  select p.*
  from public.products p
  where p.is_active
    and (
      p.search_document @@ websearch_to_tsquery('german', search_query)
      or extensions.similarity(lower(p.name_de), lower(search_query)) > 0.25
      or lower(p.sku) = lower(search_query)
    )
  order by
    ts_rank(p.search_document, websearch_to_tsquery('german', search_query)) desc,
    extensions.similarity(lower(p.name_de), lower(search_query)) desc,
    p.is_featured desc;
$$;

create or replace function public.place_request(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_postal_code text,
  p_fulfillment public.fulfillment_type,
  p_comment text,
  p_items jsonb
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_request_id uuid;
  v_request_number text;
  v_subtotal numeric(12, 2);
  v_item_count integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'At least one item is required';
  end if;
  if p_postal_code !~ '^\d{5}$' then
    raise exception 'Invalid postal code';
  end if;

  select count(*), coalesce(sum(p.price_gross * (item ->> 'quantity')::numeric), 0)
    into v_item_count, v_subtotal
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item ->> 'productId')::uuid
  where p.is_active and (item ->> 'quantity')::numeric > 0 and (item ->> 'quantity')::numeric <= 999;

  if v_item_count <> jsonb_array_length(p_items) then
    raise exception 'Invalid or inactive product';
  end if;

  v_request_number := format(
    'ANF-%s-%s',
    extract(year from now())::integer,
    lpad(nextval('public.request_number_seq')::text, 6, '0')
  );

  insert into public.requests (
    request_number, user_id, customer_name, customer_email, customer_phone,
    postal_code, fulfillment, comment, subtotal, consent_at
  ) values (
    v_request_number, auth.uid(), trim(p_customer_name), lower(trim(p_customer_email)),
    trim(p_customer_phone), p_postal_code, p_fulfillment, coalesce(p_comment, ''),
    round(v_subtotal, 2), now()
  ) returning id into v_request_id;

  insert into public.request_items (
    request_id, product_id, sku_snapshot, name_snapshot, sale_unit_snapshot,
    quantity, unit_price, line_total
  )
  select
    v_request_id, p.id, p.sku, p.name_de, p.sale_unit,
    (item ->> 'quantity')::numeric, p.price_gross,
    round(p.price_gross * (item ->> 'quantity')::numeric, 2)
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item ->> 'productId')::uuid;

  return v_request_number;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variant_links enable row level security;
alter table public.locations enable row level security;
alter table public.inventory enable row level security;
alter table public.requests enable row level security;
alter table public.request_items enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "categories_public_read" on public.categories for select to anon, authenticated using (is_active or public.is_admin());
create policy "categories_admin_all" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_public_read" on public.products for select to anon, authenticated using (is_active or public.is_admin());
create policy "products_admin_all" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "images_public_read" on public.product_images for select to anon, authenticated using (true);
create policy "images_admin_all" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "variants_public_read" on public.product_variant_links for select to anon, authenticated using (true);
create policy "variants_admin_all" on public.product_variant_links for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "locations_public_read" on public.locations for select to anon, authenticated using (is_active or public.is_admin());
create policy "locations_admin_all" on public.locations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "inventory_public_read" on public.inventory for select to anon, authenticated using (true);
create policy "inventory_admin_all" on public.inventory for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "requests_select_own" on public.requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "requests_admin_update" on public.requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "request_items_select_own" on public.request_items for select to authenticated using (exists (select 1 from public.requests r where r.id = request_id and (r.user_id = auth.uid() or public.is_admin())));

grant execute on function public.search_products(text) to anon, authenticated;
grant execute on function public.place_request(text, text, text, text, public.fulfillment_type, text, jsonb) to anon, authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, updated_at) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public;

create policy "product_images_admin_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_update" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_delete" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());
