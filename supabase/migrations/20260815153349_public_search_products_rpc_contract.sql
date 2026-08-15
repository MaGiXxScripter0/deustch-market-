alter policy "products_public_read" on public.products
using (
  (
    is_active
    and (
      category_id is null
      or exists (
        select 1
        from public.categories category_visibility
        where category_visibility.id = category_id
          and category_visibility.is_active
      )
    )
  )
  or (select private.is_admin())
);

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
      case
        when sort_order in ('relevance', 'featured', 'price-asc', 'price-desc', 'name')
          then sort_order
        else 'relevance'
      end as safe_sort,
      greatest(coalesce(page_number, 1), 1) as safe_page,
      case
        when jsonb_typeof(coalesce(filter_values, '{}'::jsonb)) = 'object'
          then coalesce(filter_values, '{}'::jsonb)
        else '{}'::jsonb
      end as filters
  ),
  matched as materialized (
    select
      p.id,
      p.slug,
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
        + extensions.similarity(lower(p.name_de), lower(input.q))
        + case
          when lower(coalesce(c.name_de, '')) like '%' || lower(input.q) || '%' then 0.25
          else 0
        end
        + coalesce((
          select max(extensions.similarity(lower(alias), lower(input.q)))
          from unnest(p.search_aliases) alias
        ), 0) as score
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
          select 1
          from unnest(p.search_aliases) alias
          where extensions.similarity(lower(alias), lower(input.q)) > 0.25
        )
        or exists (
          select 1
          from jsonb_each_text(p.specs) spec
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
    select
      matched.*,
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
    select *
    from ordered
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
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
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
          'berlin', coalesce(inventory_at_pickup.available_qty, 0),
          'pickup', coalesce(inventory_at_pickup.pickup_available, false),
          'pickupLeadTime', coalesce(inventory_at_pickup.lead_time_de, 'Abholung auf Anfrage')
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
      ) inventory_at_pickup on true
    ), '[]'::jsonb),
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

create or replace function public.search_suggestions(search_query text)
returns table (suggestion_type text, label text, meta text, href text)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select trim(coalesce(search_query, '')) as q
  )
  select *
  from (
    select 'category'::text, c.name_de, 'Kategorie'::text, '/kategorie/' || c.slug
    from public.categories c
    cross join input
    where c.is_active
      and input.q <> ''
      and lower(c.name_de || ' ' || c.description_de) like '%' || lower(input.q) || '%'
    order by c.sort_order, c.id
    limit 2
  ) categories
  union all
  select *
  from (
    select 'product'::text, p.name_de, p.sku, '/produkt/' || p.slug
    from public.products p
    left join public.categories c on c.id = p.category_id
    cross join input
    where p.is_active
      and (p.category_id is null or c.is_active)
      and input.q <> ''
      and (
        p.search_document @@ websearch_to_tsquery('german', input.q)
        or extensions.similarity(lower(p.name_de), lower(input.q)) > 0.25
        or exists (
          select 1
          from unnest(p.search_aliases) alias
          where extensions.similarity(lower(alias), lower(input.q)) > 0.25
        )
        or lower(p.sku) like lower(input.q) || '%'
      )
    order by
      ts_rank(p.search_document, websearch_to_tsquery('german', input.q)) desc,
      p.is_featured desc,
      p.name_de asc,
      p.id asc
    limit 4
  ) products
  limit 6;
$$;

revoke execute on function public.search_products(text, text, jsonb, text, integer)
from public, anon, authenticated;
grant execute on function public.search_products(text, text, jsonb, text, integer)
to anon, authenticated;

revoke execute on function public.search_suggestions(text)
from public, anon, authenticated;
grant execute on function public.search_suggestions(text)
to anon, authenticated;
