create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter policy "profiles_select_own" on public.profiles
using (id = (select auth.uid()) or private.is_admin());
alter policy "profiles_update_own" on public.profiles
using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "categories_public_read" on public.categories
using (is_active or private.is_admin());
alter policy "products_public_read" on public.products
using (is_active or private.is_admin());
alter policy "images_public_read" on public.product_images
using (exists (
  select 1 from public.products p
  where p.id = product_id and (p.is_active or private.is_admin())
));
alter policy "variants_public_read" on public.product_variant_links
using (exists (
  select 1 from public.products p
  where p.id = product_id and (p.is_active or private.is_admin())
));
alter policy "locations_public_read" on public.locations
using (is_active or private.is_admin());
alter policy "inventory_public_read" on public.inventory
using (
  private.is_admin()
  or (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    and exists (select 1 from public.locations l where l.id = location_id and l.is_active)
  )
);
alter policy "requests_select_own" on public.requests
using (user_id = (select auth.uid()) or private.is_admin());
alter policy "requests_admin_update" on public.requests
using (private.is_admin()) with check (private.is_admin());
alter policy "request_items_select_own" on public.request_items
using (exists (
  select 1 from public.requests r
  where r.id = request_id
    and (r.user_id = (select auth.uid()) or private.is_admin())
));

drop policy "categories_admin_all" on public.categories;
drop policy "products_admin_all" on public.products;
drop policy "images_admin_all" on public.product_images;
drop policy "variants_admin_all" on public.product_variant_links;
drop policy "locations_admin_all" on public.locations;
drop policy "inventory_admin_all" on public.inventory;

create policy "categories_admin_insert" on public.categories for insert to authenticated
with check (private.is_admin());
create policy "categories_admin_update" on public.categories for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "categories_admin_delete" on public.categories for delete to authenticated
using (private.is_admin());
create policy "products_admin_insert" on public.products for insert to authenticated
with check (private.is_admin());
create policy "products_admin_update" on public.products for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "products_admin_delete" on public.products for delete to authenticated
using (private.is_admin());
create policy "images_admin_insert" on public.product_images for insert to authenticated
with check (private.is_admin());
create policy "images_admin_update" on public.product_images for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "images_admin_delete" on public.product_images for delete to authenticated
using (private.is_admin());
create policy "variants_admin_insert" on public.product_variant_links for insert to authenticated
with check (private.is_admin());
create policy "variants_admin_update" on public.product_variant_links for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "variants_admin_delete" on public.product_variant_links for delete to authenticated
using (private.is_admin());
create policy "locations_admin_insert" on public.locations for insert to authenticated
with check (private.is_admin());
create policy "locations_admin_update" on public.locations for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "locations_admin_delete" on public.locations for delete to authenticated
using (private.is_admin());
create policy "inventory_admin_insert" on public.inventory for insert to authenticated
with check (private.is_admin());
create policy "inventory_admin_update" on public.inventory for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "inventory_admin_delete" on public.inventory for delete to authenticated
using (private.is_admin());

alter policy "product_images_admin_insert" on storage.objects
with check (bucket_id = 'product-images' and private.is_admin());
alter policy "product_images_admin_update" on storage.objects
using (bucket_id = 'product-images' and private.is_admin())
with check (bucket_id = 'product-images' and private.is_admin());
alter policy "product_images_admin_delete" on storage.objects
using (bucket_id = 'product-images' and private.is_admin());

drop function public.is_admin();

create index if not exists product_variant_links_sibling_idx
on public.product_variant_links (sibling_product_id);
create index if not exists request_items_request_idx on public.request_items (request_id);
create index if not exists request_items_product_idx on public.request_items (product_id);
